import {
  Inject,
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { FilterQuery, Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { MUUID, v4 } from 'uuid-mongodb'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { ConfigService } from '@nestjs/config'
import {
  AuctionStatus,
  AuctionType,
  Currency,
  HistoryType,
  NftStatus,
  SecondarySaleMode
} from '../shared/enum'
import { Auction } from './schemas/auction.schema'
import { ListNftDto, Seller } from '../nft/dto/list-nft.dto'
import { uuidFrom } from '../utils/uuid'
import { Nft } from '../nft/schemas/nft.schema'
import { MessagePatternGenerator } from '../utils/message-pattern-generator'
import { User } from '../user/schemas/user.schema'
import { CreateNftHistoryDto } from '../nft/dto/nft-history.dto'
import { NftHistory } from '../nft/schemas/nft-history.schema'
import { Royalties } from '../avn-transaction/schemas/avn-transaction.schema'
import { getDefaultRoyalties } from '../utils/get-royalties'
import { getPlatformFees } from '../utils/settings/getPlatformFees'
import { Bid } from '../payment/schemas/bid.dto'

@Injectable()
export class ListingService {
  private logger = new Logger(ListingService.name)

  constructor(
    @InjectModel(Auction.name) private auctionModel: Model<Auction>,
    @InjectModel(Bid.name) private bidModel: Model<Bid>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private configService: ConfigService
  ) {}

  /**
   * Create a new auction
   * @param seller Seller
   * @param listNftDto ListNftDto
   * @param isSecondary Is secondary
   */
  async createAuction(
    seller: Seller,
    listNftDto: ListNftDto,
    isSecondary: boolean
  ): Promise<Auction> {
    // Throw error if currency is invalid
    if (
      ![Currency.ETH, Currency.USD, Currency.NONE].includes(listNftDto.currency)
    ) {
      throw new UnprocessableEntityException('Auction malformed.')
    }

    const auction: Auction = {
      _id: v4(),
      nft: {
        _id: uuidFrom(listNftDto.nftId),
        eid: listNftDto.anvNftId,
        anvNftId: listNftDto.anvNftId
      },
      seller: {
        _id: uuidFrom(seller.id),
        avnPubKey: seller.avnPubKey
      },
      endTime: new Date(listNftDto.endTime),
      isSecondary,
      // We only set the winner for FreeClaim to prevent claiming twice
      ...(listNftDto.type === AuctionType.freeClaim &&
        listNftDto.winner && {
          winner: {
            _id: uuidFrom(listNftDto.winner._id),
            avnPubKey: listNftDto.winner.avnPubKey
          }
        }),
      highestBidId: null,
      status: listNftDto.status,
      reservePrice: listNftDto.reservePrice,
      currency: Currency[listNftDto.currency] ?? Currency.NONE,
      type: AuctionType[listNftDto.type] ?? AuctionType.highestBid
    }

    return await this.auctionModel.create(auction)
  }

  /**
   * Gets auction that bidder can still bid on.
   * Not withdrawn, not ended, and not sold
   * @param nftId NFT ID
   */
  async getCurrentAuctionByNftId(nftId: MUUID): Promise<Auction> {
    const statuses = [AuctionStatus.open, AuctionStatus.unconfirmed]

    return this.auctionModel
      .findOne({
        'nft._id': nftId,
        status: { $in: statuses }
      })
      .sort({
        createdAt: -1
      })
  }

  /**
   * Returns true if the nft has already been purchased before, false if not.
   * @param nftId The id of the NFT to check.
   * @param auctionId
   */
  async isNftSecondHand(nftId: MUUID): Promise<boolean> {
    const query: FilterQuery<Auction> = {
      'nft._id': nftId,
      status: AuctionStatus.sold
    }
    const auctionItem = await this.auctionModel.findOne(query)
    return Boolean(auctionItem)
  }

  /**
   * Checks if the currency of the NFT is allowed to be sold.
   * @param listNftDto list NFT DTO
   * @param isSecondary is secondary sale
   * @param nftObject NFT object
   * @throws BadRequestException if is not allowed
   */
  checkAllowedSaleCurrency(
    listNftDto: ListNftDto,
    isSecondary: boolean,
    nftObject: Nft
  ): void {
    const secondarySaleMode = this.configService.get<string>(
      'app.secondarySaleMode'
    )
    // Pass if not a secondary sale or secondary sale mode is not set
    if (!secondarySaleMode || !isSecondary) {
      return
    }

    // Throw if no secondary sale allowed
    if (secondarySaleMode === SecondarySaleMode.none) {
      throw new BadRequestException(
        { value: { message: 'noSecondarySales' } },
        'Validation failed'
      )
    }

    // Throw if listing currency doesn't match NFT primary sale currency
    if (
      // Refactor to use getPaymentProvidersForNft because
      // it may be wrong to check 1 to 1 currency (we could have more crypto)
      secondarySaleMode === SecondarySaleMode.match_primary &&
      listNftDto.currency !== Currency.NONE &&
      nftObject.primarySaleCurrency !== Currency.NONE &&
      nftObject.primarySaleCurrency !== listNftDto.currency
    ) {
      throw new BadRequestException(
        {
          value: { message: 'matchPrimaryCurrency', value: listNftDto.currency }
        },
        'Validation failed'
      )
    }
  }

  /**
   * Validates the auction close date.
   * @param listNftDto list NFT DTO
   * @throws BadRequestException if the date is invalid
   */
  validateAuctionCloseDate(listNftDto: ListNftDto): void {
    const endTime = new Date(listNftDto.endTime).getTime()
    const now = Date.now()
    if (endTime < now) {
      throw new BadRequestException({
        endDate: {
          message: 'End date must be in the future',
          value: listNftDto.endTime
        }
      })
    }

    const isFixedPrice = listNftDto.type === AuctionType.fixedPrice
    const maxDays = 30
    if (!isFixedPrice && endTime > now + maxDays * 24 * 60 * 60 * 1000) {
      throw new BadRequestException({
        endDate: {
          message: 'NFTs can be auctioned for a maximum of 30 days',
          value: listNftDto.endTime
        }
      })
    }

    const minMinutes = 15
    if (endTime < now + minMinutes * 60 * 1000) {
      throw new BadRequestException({
        endDate: {
          message:
            'End time must be at least 15 minutes after listing the item for sale.',
          value: listNftDto.endTime
        }
      })
    }
  }

  /**
   * Get auction by ID
   * @param auctionId Auction ID
   */
  async getAuctionById(auctionId: MUUID): Promise<Auction> {
    return this.auctionModel.findOne({
      _id: auctionId
    })
  }

  /**
   * Update auction status
   * @param auctionId Auction ID
   * @param status Status
   */
  async updateAuctionStatus(
    auctionId: MUUID,
    status: AuctionStatus
  ): Promise<Auction> {
    return this.auctionModel.findOneAndUpdate(
      { _id: auctionId },
      { status },
      { new: true }
    )
  }

  /**
   * Cancel Auction that is part of an Edition listing and in USD.
   * No AvN cancelation is needed.
   * PS: To be used when Edition (cancel) listing is added.
   * @param auction Auction
   */
  async cancelUsdEditionAuction(auction: Auction): Promise<Auction> {
    // Set all other auctions in the same edition listing to withdraw
    await this.auctionModel.updateMany(
      {
        editionListingId: auction.editionListingId,
        status: { $in: [AuctionStatus.open, AuctionStatus.unconfirmed] }
      },
      { status: AuctionStatus.withdraw }
    )

    // Set this auction to withdraw
    const updatedAuction = await this.updateAuctionStatus(
      uuidFrom(auction._id),
      AuctionStatus.withdraw
    )

    // Set NFT status to minted
    await this.setNftStatus(
      uuidFrom(auction.nft._id).toString(),
      NftStatus.minted
    )

    return updatedAuction
  }

  /**
   * Cancel Auction that is in ETH.
   * This is called once the event is processed,
   * so this is supposed to be the final stage.
   * @param auction Auction
   * @param user User
   */
  async cancelNoneUsdAuction(auction: Auction, user: User): Promise<Auction> {
    // Set NFT status to owned or minted
    await this.setNftStatus(
      uuidFrom(auction.nft._id).toString(),
      auction.isSecondary ? NftStatus.owned : NftStatus.minted
    )

    // Add history item to NFT
    await this.addAuctionCancelationNftHistory(auction, user)

    // Set Auction status to withdraw
    return await this.updateAuctionStatus(auction._id, AuctionStatus.withdraw)
  }

  /**
   * Add NFT history after canceling an auction
   * @param auction Auction
   * @param user User
   */
  private async addAuctionCancelationNftHistory(
    auction: Auction,
    user: User
  ): Promise<NftHistory> {
    const historyEntry: CreateNftHistoryDto = {
      auctionId: auction._id,
      nftId: uuidFrom(auction.nft._id).toJSON(),
      userAddress: `${user.avnPubKey}`,
      type: HistoryType.cancelled,
      currency: auction.currency,
      amount: auction.reservePrice
    }

    const addedNftHistory = await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('nft', 'addHistory'),
        historyEntry
      )
    )

    this.logger.debug(
      `[addAuctionCancelationNftHistory] NFT history added/updated ${addedNftHistory._id}`
    )

    return addedNftHistory
  }

  /**
   * Set NFT status
   * @param nftId NFT ID
   * @param nftStatus NFT status
   */
  private async setNftStatus(
    nftId: string,
    nftStatus: NftStatus
  ): Promise<Nft> {
    const res = await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'setStatusToNft'), {
        nftId,
        nftStatus
      })
    )

    this.logger.debug(`[setNftStatus] NFT status updated to ${res?.status}`)

    return res
  }

  /**
   * Calculates the total fees for a transaction based on the value and NFT ID.
   * @param {string} value - The value of the transaction.
   * @param {MUUID} nftId - The ID of the NFT being transacted.
   * @returns {Promise<number>} - The total fees for the transaction.
   */
  async calculateFeesTotal(value: string, nftId: MUUID): Promise<number> {
    const nft = await this.getNftById(nftId)
    if (!nft) {
      this.logger.error(`[calculateFeesTotal] NFT not found ${nftId}`)
      throw new NotFoundException('NFT not found')
    }

    const defaultRoyaltyFees = this.calculateRoyaltyFees(value, nft?.royalties)

    const nftRoyalties = this.findNftRoyalties(nft?.royalties)

    const platformFees =
      Number(value) * (getPlatformFees(nftRoyalties)?.stripe ?? 0)

    const feesTotal = Math.ceil(defaultRoyaltyFees + platformFees)

    return feesTotal <= Number(value) ? feesTotal : Number(value)
  }

  /**
   * Adds up all royalties in the royalties array and returns the platform fee
   * to apply to the bid/purchase. The number returned is an integer representing
   * the smallest currency unit possible, e.g. cents for USD, or Wei for ETH.
   * For example, the value 100 is $1.00 (USD) or 100 Wei (ETH), the value 1000 is $10.00 (USD) or 1000 Wei (ETH).
   * @param value The amount as a string, e.g. "1000" is $10.00 (USD) or 1000 Wei (ETH).
   * @param royalties custom royalties set on an NFT, e.g. "2" represents "2%" of the NFT value.
   */
  calculateRoyaltyFees(value: string, royalties?: number): number {
    // Loop the ROYALTIES array and add up each royalty value
    // If NFT custom royalties percentage is set use it
    const defaultRoyalties = getDefaultRoyalties()
    const royaltiesTotal: number = defaultRoyalties.reduce(
      (value: number, entry: Royalties) => {
        value +=
          royalties !== undefined
            ? royalties * 10000
            : entry.rate.parts_per_million
        return value
      },
      0
    )

    const amount: number = parseInt(value, 10)

    // Example:
    // amount = 4588
    // royalties = 10000 (1%)
    // output should be $0.46 = 46

    return Math.round(amount * (royaltiesTotal / 1000000))
  }

  /**
   * Gets NFT by ID from NFT service
   * @param nftId NFT ID
   */
  private async getNftById(nftId: MUUID): Promise<Nft> {
    return await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('nft', 'findOneById'),
        nftId.toString()
      )
    )
  }

  /**
   * Find royalties of an NFT in right unit or return default
   * @param royalties Royalties
   */
  private findNftRoyalties = (royalties: number | undefined): number => {
    if (royalties === undefined || royalties === null) {
      return this.calculateRoyaltyFees('100') / 100
    }
    return royalties / 100
  }

  /**
   * Update Bid by ID
   */
  async updateBidById(_id: MUUID, bidPatch: Partial<Bid>): Promise<Bid> {
    this.logger.debug(`[updateBidById] ${_id} ${JSON.stringify(bidPatch)}`)
    return await this.bidModel
      .findOneAndUpdate({ _id }, bidPatch, { new: true })
      .exec()
  }

  async getBidById(_id: MUUID): Promise<Bid> {
    return await this.bidModel.findOne({ _id }).exec()
  }

  /**
   * Update Auction by ID
   */
  async updateAuctionById(
    _id: MUUID,
    auctionPatch: Partial<Auction>
  ): Promise<Auction> {
    return await this.auctionModel
      .findOneAndUpdate({ _id }, auctionPatch, { new: true })
      .exec()
  }
}
