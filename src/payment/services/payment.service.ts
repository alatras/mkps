import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  Logger
} from '@nestjs/common'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import { BigNumber } from '@ethersproject/bignumber'
import { InjectModel } from '@nestjs/mongoose'
import { firstValueFrom } from 'rxjs'
import { Lock } from 'redlock'
import { ClientProxy } from '@nestjs/microservices'
import { isKycEnabled } from '../../utils/isKycEnabled'
import Stripe from 'stripe'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import {
  AuctionStatus,
  BidStatus,
  Currency,
  KycStatus,
  PaymentStatus
} from '../../shared/enum'
import { User } from '../../user/schemas/user.schema'
import { CreateBidDto } from '../dto/createBid.dto'
import { ListingService } from '../../listing/listing.service'
import { uuidFrom } from '../../utils'
import { Bid } from '../../payment/schemas/bid.dto'
import { NewBidHistoryDto } from '../../nft/dto/nft-history.dto'
import { PlaceBidDto } from '../dto/placeBid.dto'
import { StripeService } from '../stripe/stripe.service'
import { Auction } from '../../listing/schemas/auction.schema'
import { EmailService } from '../../common/email/email.service'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly listingService: ListingService,
    private readonly stripeService: StripeService,
    private readonly emailService: EmailService,
    @InjectModel(Bid.name) private bidModel: Model<Bid>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {}

  /**
   * Create a Bid for an NFT.
   * This creates the Bid locally only.
   * @param user User
   * @param createBidDto Place bid DTO
   */
  async createBid(user: User, createBidDto: CreateBidDto): Promise<Bid> {
    // Throw if no KYC
    if (
      isKycEnabled() &&
      user.provider.metadata?.kycStatus !== KycStatus.verified
    ) {
      throw new UnauthorizedException('Not KYC verified')
    }

    // Throw if no Auction
    const { auctionId } = createBidDto
    const auction = await this.listingService.getAuctionById(
      uuidFrom(auctionId)
    )
    if (!auction) {
      throw new NotFoundException('Auction not found')
    }

    // Throw if Auction is not open
    if (auction.status !== AuctionStatus.open) {
      throw new BadRequestException('Auction is not open')
    }

    // Throw if user owns the Auction
    if (user._id.toString() === auction.seller._id.toString()) {
      throw new BadRequestException('User bids on their own NFT')
    }

    // Throw if bid value is lower than Auction reserve price
    if (
      BigNumber.from(createBidDto.value).lt(
        BigNumber.from(auction.reservePrice)
      )
    ) {
      throw new BadRequestException('Bid value is too low')
    }

    // Throw if bid value is lower than Auction current winning bid
    if (auction.highestBidId) {
      const highestBid = await this.bidModel.findById(auction.highestBidId)
      if (
        BigNumber.from(createBidDto.value).lt(BigNumber.from(highestBid.value))
      ) {
        throw new BadRequestException('Bid value is too low')
      }
    }

    // Create a bid
    const bid: Bid = {
      _id: MUUID.v4(),
      auctionId: auctionId,
      status: BidStatus.processing,
      owner: {
        _id: user._id,
        avnPubKey: user.avnPubKey ?? undefined
      },
      value: createBidDto.value,
      currency: createBidDto.currency,
      stripe: null
    }
    await this.bidModel.create(bid)

    // Add bid history item to NfT
    const history: NewBidHistoryDto = {
      bidId: bid._id,
      nftId: MUUID.from(auction.nft._id).toString(),
      auctionId: uuidFrom(auctionId),
      userAddress: bid.owner.avnPubKey ?? '',
      currency: bid.currency,
      amount: bid.value,
      paymentStatus: PaymentStatus.pending
    }
    const nftHistory = await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('nft', 'addHistory'),
        history
      )
    )
    if (!nftHistory) {
      throw new BadRequestException('Failed to add bid history')
    }

    return bid
  }

  /**
   * Place a bid on an NFT.
   * This creates the Bid locally and on Stripe.
   * @param user User
   * @param placeBidDto Place bid DTO
   */
  async bid(
    user: User,
    placeBidDto: PlaceBidDto
  ): Promise<{ hasPaymentMethod: boolean }> {
    // Create a Stripe customer if not exists
    let fullUserObject: User = null
    if (!user.stripeCustomerId) {
      await this.stripeService.createCustomer(user)
      fullUserObject = await firstValueFrom(
        this.clientProxy.send(MessagePatternGenerator('user', 'getUserById'), {
          userId: user._id
        })
      )
      if (!fullUserObject) {
        throw new NotFoundException('User object not found.')
      }
      if (!fullUserObject.stripeCustomerId) {
        throw new InternalServerErrorException(
          'Could not create Stripe customer ID.'
        )
      }
    }

    // Acquire a lock on the NFT
    const nftId = uuidFrom(placeBidDto.nftId)
    const lock: Lock = await this.stripeService.acquireBidRedlock(nftId)

    try {
      // Create the bid
      const auction = await this.listingService.getAuctionById(
        uuidFrom(placeBidDto.nftId)
      )
      const createBidObject: CreateBidDto = {
        auctionId: MUUID.from(auction._id).toString(),
        value: String(placeBidDto.amount),
        currency: Currency.USD
      }
      let bid = await this.createBid(user, createBidObject)

      // Create a payment intent
      const paymentMethods = await this.stripeService.getPaymentMethods(
        fullUserObject.stripeCustomerId
      )
      const paymentMethod = paymentMethods[0]
      if (!paymentMethod) {
        return { hasPaymentMethod: false }
      }
      const paymentIntent = await this.stripeService.createPaymentIntentForBid(
        bid,
        user.stripeCustomerId,
        uuidFrom(nftId),
        paymentMethod.id
      )

      // Update the bid with payment intent
      bid = await this.listingService.updateBidById(bid._id, {
        stripe: {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentMethod.id,
          captured: false
        }
      })

      await this.cancelPreviousBidsForUser(bid, user, auction)
      await this.stripeService.confirmPaymentIntent(paymentIntent.id)
      await this.setPaymentMethodOnBid(bid, paymentMethod.id)

      return { hasPaymentMethod: !!paymentMethod }
    } catch (err) {
      this.logger.error('Could not place bid', {
        user: uuidFrom(user._id).toString(),
        error: err
      })

      if (
        err.type === 'StripeCardError' ||
        (err.code && err.code.startsWith('amount_'))
      ) {
        throw new BadRequestException(err.message)
      }

      throw err
    } finally {
      if (lock) {
        await lock.release()
      }
    }
  }

  async cancelPreviousBidsForUser(
    bid: Bid,
    user: User,
    auction: Auction
  ): Promise<void> {
    try {
      const unCapturedBids: Bid[] = await this.getUncapturedBidsForFiatAuction(
        auction,
        user
      )

      const previousBids = unCapturedBids.filter(
        unCapturedBid => unCapturedBid.createdAt < bid.createdAt
      )

      await Promise.all(
        previousBids.map(bid =>
          this.stripeService.cancelPaymentIntentOnBid(bid)
        )
      )
    } catch (e) {
      this.logger.error('Could not cancel previous bids for user', {
        user: uuidFrom(user._id).toString()
      })
      throw e
    }
  }

  async getUncapturedBidsForFiatAuction(
    auction: Auction,
    user?: User
  ): Promise<Bid[]> {
    const uuid = uuidFrom(auction._id)

    const query: any = {
      auctionId: uuid,
      status: BidStatus.processing,
      'stripe.paymentIntentId': { $ne: null },
      'stripe.captured': { $ne: true },
      $or: [
        { 'stripe.canceled': { $exists: false } },
        { 'stripe.canceled': { $ne: true } }
      ]
    }

    if (user) {
      query['owner._id'] = user._id
    }

    const bids = await this.bidModel.find(query)
    return bids
  }

  async setPaymentMethodOnBid(
    bid: Bid,
    paymentMethodId: string
  ): Promise<void> {
    this.logger.log(`Set PaymentMethod on bid for ${paymentMethodId}`)

    await this.listingService.updateBidById(bid._id, {
      stripe: { ...bid.stripe!, paymentMethodId }
    })
    await this.updateHighestBid(bid)
    // I don't know why we have 2 copies of bids (one in bids collection and another in history) with very similar data

    this.logger.log(
      `Updated HighestBid for ${paymentMethodId}: ${uuidFrom(
        bid._id
      ).toString()}`
    )
    // await setPaymentFlagOnBidHistory(bid)
    this.logger.log(`Updated Flag on BidHistory for ${paymentMethodId}`)
  }

  async updateHighestBid(bid: Bid) {
    const auction = await this.listingService.getAuctionById(
      uuidFrom(bid.auctionId)
    )
    if (!auction) {
      this.logger.error(
        `[updateHighestBid] Auction ${bid.auctionId.toString()} not found`
      )
    }
    throw new InternalServerErrorException(
      `Error updating highest bid, auction: ${bid.auctionId.toString()} not found`
    )

    let currentHighestBid: Bid | undefined | null
    let currentHighestBidValue = BigNumber.from(0)
    let highestBidValue: string = currentHighestBidValue.toString()

    if (auction.highestBidId) {
      currentHighestBid = await this.listingService.getBidById(
        uuidFrom(auction.highestBidId)
      )
      if (!currentHighestBid) {
        throw new Error(
          `Highest bid details not found for bid Id: ${auction.highestBidId}`
        )
      }

      currentHighestBidValue = BigNumber.from(currentHighestBid.value)
    }

    if (currentHighestBidValue.toString() === BigNumber.from(0).toString()) {
      await this.emailService.sendFirstBidNotificationToOwner(auction, bid)
    }

    // Update the highest bid if this bid is higher
    if (currentHighestBidValue.lt(bid.value)) {
      await this.listingService.updateAuctionById(auction._id, {
        highestBidId: bid._id
      })
      highestBidValue = bid.value
    }

    if (currentHighestBid) {
      if (currentHighestBid.owner._id.toString() !== bid.owner._id.toString()) {
        await this.emailService.sendOutbidNotificationToSecondHighestBidder(
          auction,
          currentHighestBid,
          highestBidValue
        )
      }
    }
  }

  getAccount = async (accountId: string): Promise<Stripe.Account> => {
    return await this.stripeService.getAccount(accountId)
  }
}
