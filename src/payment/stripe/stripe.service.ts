import {
  Injectable,
  InternalServerErrorException,
  Inject,
  ConflictException,
  Logger
} from '@nestjs/common'
import { Auth0Service } from '../../user/auth0.service'
import { User } from '../../user/schemas/user.schema'
import { ClientProxy } from '@nestjs/microservices'
import Stripe from 'stripe'
import { firstValueFrom } from 'rxjs'
import { Lock, ResourceLockedError } from 'redlock'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { MUUID } from 'uuid-mongodb'
import { redlock } from '../../utils/redis'
import { uuidFrom } from '../../utils'
import { BigNumber } from '@ethersproject/bignumber'
import { Bid } from '../schemas/bid.dto'
import { ListingService } from '../../listing/listing.service'

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name)

  private stripe: Stripe

  constructor(
    private readonly auth0Service: Auth0Service,
    private readonly listingService: ListingService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2022-11-15'
    })
  }

  /**
   * Get a Stripe account by ID
   * @param accountId Stripe account ID
   */
  async getAccount(accountId: string): Promise<Stripe.Account> {
    return await this.stripe.accounts.retrieve(accountId)
  }

  /**
   * Create a new Stripe customer for the given user
   * @param user The user to create a Stripe customer for
   */
  async createCustomer(user: User): Promise<void> {
    // Get the Auth0 user
    const auth0Id = this.auth0Service.getAuth0UserId(user)
    const auth0User = await this.auth0Service.getAuth0User(auth0Id)
    if (!auth0User || !auth0User?.name || !auth0User?.nickname) {
      throw new InternalServerErrorException('Auth0 user not found.')
    }

    // Create the Stripe customer
    const stripeCustomer = await this.stripe.customers.create({
      email: auth0User?.email ?? undefined,
      name: auth0User?.name || auth0User?.nickname
    })

    // Update the user with the Stripe customer ID
    const userUpdate = await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'updateUserById'), {
        userId: user._id,
        data: { stripeCustomerId: stripeCustomer.id }
      })
    )
    if (!userUpdate) {
      throw new InternalServerErrorException('User update failed.')
    }
  }

  /**
   * Attempts to acquire a redlock for a given NFT bid.
   * @async
   * @param {MUUID} nftId - The ID of the NFT bid to acquire a lock for.
   */
  acquireBidRedlock = async (nftId: MUUID): Promise<Lock> => {
    if (!redlock) {
      return null
    }

    try {
      const resource = `bid:${nftId}`
      return await redlock.acquire([resource], 120000)
    } catch (e) {
      if (e instanceof ResourceLockedError) {
        throw new ConflictException('Higher bid exists.')
      }
      throw e
    }
  }

  /**
   * Gets an array of Stripe PaymentMethod objects for a given customer ID.
   * @param {string} customerId - The unique identifier of the customer.
   * @returns {Promise<Stripe.PaymentMethod[]>} - An array of PaymentMethod objects.
   */
  getPaymentMethods = async (
    customerId: string
  ): Promise<Stripe.PaymentMethod[]> => {
    const methodObject = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    })

    return methodObject.data
  }

  createPaymentIntentForBid = async (
    bid: Bid,
    stripeCustomerId: string,
    nftId: MUUID,
    paymentMethodId?: string
  ): Promise<Stripe.PaymentIntent> => {
    let sellerStripeAccountId: string | null | undefined = undefined
    let platformFee: number

    const auction = await this.listingService.getAuctionById(
      uuidFrom(bid.auctionId)
    )
    if (!auction) {
      throw new InternalServerErrorException(
        `[createPaymentIntentForBid] Auction ${bid.auctionId} not found`
      )
    }
    this.logger.log(
      `[createPaymentIntentForBid] NFT ${nftId.toString()} is second hand: ${
        auction.isSecondary
      }`
    )

    const params: Stripe.PaymentIntentCreateParams = {
      payment_method_types: ['card'],
      amount: BigNumber.from(bid.value).toNumber(),
      currency: 'usd',
      capture_method: 'manual',
      customer: stripeCustomerId,
      metadata: { bid: uuidFrom(bid._id).toString() }
    }

    if (auction.isSecondary) {
      // The nft is a second-hand sale, grab the seller's stripeAccountId so we can
      // pass that to the createPaymentIntentForBid()
      const sellerUser: User | null = await this.getUserById(auction.seller._id)
      if (!sellerUser) {
        this.logger.error('[createPaymentIntentForBid] Seller not found')
        throw new InternalServerErrorException(
          `Seller ${auction.seller._id} not found`
        )
      }

      sellerStripeAccountId = sellerUser?.stripeAccountId

      if (sellerStripeAccountId) {
        this.logger.log(
          `[createPaymentIntentForBid] Seller has a stripe connected account ${sellerStripeAccountId}`
        )

        // Now grab the platform fee we would apply to this bid
        platformFee = await this.listingService.calculateFeesTotal(
          bid.value,
          auction.nft._id
        )

        this.logger.log(
          `[createPaymentIntentForBid] The bid is "${bid.value}" and the platform fee will be "${platformFee}"`
        )

        this.applyPlatformFeeToPaymentIntent(
          params,
          platformFee,
          sellerStripeAccountId
        )
      }
    } else {
      this.logger.log(
        `[createPaymentIntentForBid] Payment intent is not a second hand sale`
      )
    }

    if (paymentMethodId) {
      params.payment_method = paymentMethodId
    }

    return await this.stripe.paymentIntents.create(params)
  }

  /**
   * Get User from user service
   * @param userId
   */
  private async getUserById(userId: MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('user', 'getUserById'),
        userId.toString()
      )
    )
  }

  /**
   * Applies platform fee to Stripe PaymentIntent and sets sellerStripeAccountId as the transfer destination.
   * @param {Stripe.PaymentIntentCreateParams} params - The PaymentIntent creation parameters.
   * @param {number} platformFee - The amount of platform fee to be applied to the PaymentIntent.
   * @param {string} sellerStripeAccountId - The Stripe Account ID of the seller who will receive the payment.
   */
  private applyPlatformFeeToPaymentIntent = (
    params: Stripe.PaymentIntentCreateParams,
    platformFee: number,
    sellerStripeAccountId: string
  ): void => {
    // The nft is a second-hand sale so we will charge platform fees and whatever remains
    // after the fee is transferred to the seller's connected account
    params.application_fee_amount = platformFee
    params.transfer_data = {
      destination: sellerStripeAccountId
    }
    this.logger.log(
      `[applyPlatformFeeToPaymentIntent] Payment intent is a second hand sale, proceeds will transfer to ${sellerStripeAccountId} with a platform fee of ${platformFee}`
    )
  }

  async cancelPaymentIntentOnBid(bid: Bid): Promise<void> {
    const { _id, stripe: paymentMethod } = bid
    if (!paymentMethod) {
      this.logger.error('[cancelPaymentIntentOnBid] No stripe details attached')
      throw new InternalServerErrorException(
        'No stripe details attached to bid'
      )
    }
    const { paymentIntentId } = paymentMethod
    if (!paymentIntentId) {
      this.logger.error('[cancelPaymentIntentOnBid] No payment intent attached')
      throw new InternalServerErrorException(
        'No payment intent attached to bid'
      )
    }

    let canceled = false
    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      paymentIntentId
    )

    if (paymentIntent.status === 'canceled') {
      this.logger.log(
        `[cancelPaymentIntentOnBid] PaymentIntent ${paymentIntentId} was already canceled`
      )
      canceled = true
    }

    if (
      !canceled &&
      [
        'requires_payment_method',
        'requires_capture',
        'requires_confirmation',
        'requires_action',
        'processing'
      ].includes(paymentIntent.status)
    ) {
      await this.stripe.paymentIntents.cancel(paymentIntentId)
      canceled = true
    }

    if (!canceled) {
      this.logger.error('[cancelPaymentIntentOnBid] Could not cancel bid')
      throw new Error('Could not cancel bid')
    }
    await this.listingService.updateBidById(_id, {
      stripe: { ...bid.stripe!, canceled }
    })
  }

  async confirmPaymentIntent(paymentIntentId: string) {
    this.logger.log(
      `[confirmPaymentIntent] Confirming PaymentIntent for ${paymentIntentId}`
    )

    const confirmedRequest: any = await this.stripe.paymentIntents.confirm(
      paymentIntentId
    )

    // TODO: check on the fact that 'charges' doesn't exist on the type definition for PaymentIntent
    const confirmed = confirmedRequest.charges.data[0].status === 'succeeded'

    if (!confirmed) {
      this.logger.error(
        `[confirmPaymentIntent] Could not confirm payment ${paymentIntentId}`
      )
      throw new InternalServerErrorException('Could not confirm payment')
    }
  }
}
