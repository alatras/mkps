import {
  Injectable,
  InternalServerErrorException,
  Inject,
  ConflictException,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { Auth0Service } from '../../user/auth0.service'
import { User } from '../../user/schemas/user.schema'
import { ClientProxy } from '@nestjs/microservices'
import Stripe from 'stripe'
import { firstValueFrom } from 'rxjs'
import { Lock, ResourceLockedError } from 'redlock'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { MUUID } from 'uuid-mongodb'
import { uuidFrom } from '../../utils'
import { BigNumber } from '@ethersproject/bignumber'
import { Bid } from '../schemas/bid.dto'
import { ListingService } from '../../listing/listing.service'
import { StripePaymentIntentStatus } from '../../shared/enum'
import { Auction } from '../../listing/schemas/auction.schema'
import { RedisService } from '../../common/redis/redis.service'

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name)

  private stripe: Stripe

  constructor(
    private readonly auth0Service: Auth0Service,
    private readonly listingService: ListingService,
    private readonly redisService: RedisService,
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
      throw new InternalServerErrorException(
        'User update failed after Stripe customer creation.'
      )
    }
  }

  /**
   * Attempts to acquire a redlock for a given NFT bid.
   * @async
   * @param {MUUID} nftId - The ID of the NFT bid to acquire a lock for.
   */
  acquireBidRedlock = async (nftId: MUUID): Promise<Lock> => {
    try {
      const resource = `bid:${nftId}`
      return await this.redisService.acquireRedLock([resource], 120000)
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

  /**
   * Gets a Stripe PaymentMethod object for a given payment method ID.
   * @param {string} paymentMethodId - The unique identifier of the payment method.
   * @returns {Promise<Stripe.PaymentMethod>} - A PaymentMethod object.
   */
  getPaymentMethod = async (
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> => {
    return await this.stripe.paymentMethods.retrieve(paymentMethodId)
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

  /**
   * Confirms a Stripe PaymentIntent.
   * @param {string} paymentIntentId - The ID of the PaymentIntent to confirm.
   * @returns {Promise<void>} - A Promise that resolves when the PaymentIntent is confirmed.
   */
  async confirmPaymentIntent(paymentIntentId: string) {
    this.logger.debug(`Confirming PaymentIntent for ${paymentIntentId}`)

    const confirmedRequest: any = await this.stripe.paymentIntents.confirm(
      paymentIntentId
    )

    const confirmed = [
      StripePaymentIntentStatus.requiresCapture,
      StripePaymentIntentStatus.requiresAction,
      StripePaymentIntentStatus.succeeded
    ].includes(confirmedRequest.status)

    if (!confirmed) {
      this.logger.error(`Could not confirm payment ${paymentIntentId}`)
      throw new InternalServerErrorException('Could not confirm payment')
    }
  }

  /**
   * Creates a Stripe Customer for a given User.
   * @param {User} user - The User for which to create a Stripe Customer.
   * @returns {Promise<Stripe.Customer>} - The Stripe Customer.
   */
  async createStripeCustomer(
    user: User,
    updateUser?: boolean
  ): Promise<Stripe.Customer> {
    const auth0Id = this.auth0Service.getAuth0UserId(user)
    const auth0User = await this.auth0Service.getAuth0User(auth0Id)

    const customer: Stripe.Customer = await this.stripe.customers.create({
      email: auth0User?.email || user.email,
      name: auth0User?.name || auth0User?.nickname || user.email,
      metadata: { userId: user._id.toString() }
    })

    if (updateUser) {
      await this.updateUserById(user._id.toString(), {
        stripeCustomerId: customer.id
      })
    }

    return customer
  }

  /**
   * Update User
   * @param userId
   * @param data
   */
  async updateUserById(userId: string, data: Partial<User>): Promise<User> {
    const updated = await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'updateUserById'), {
        userId,
        data
      })
    )
    if (!updated) {
      this.logger.error(`[updateUserById] User ${userId} update failed`)
      throw new InternalServerErrorException(
        'User update failed after Stripe customer creation.'
      )
    }
    return updated
  }

  /**
   * Get User by Stripe Customer ID
   * @param stripeCustomerId
   * @returns {Promise<User>}
   * @private
   */
  private async getUserByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<User> {
    const user = await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('user', 'getUserByStripeCustomerId'),
        { stripeCustomerId }
      )
    )
    if (!user) {
      const message = `User with Stripe Customer ID ${stripeCustomerId} not found`
      this.logger.error(`[getUserByStripeCustomerId] ${message}`)
      throw new NotFoundException(message)
    }
    return user
  }

  /**
   * Create Payment Intent for Auction
   * @param auction
   * @param stripeCustomerId
   * @returns {Promise<Stripe.PaymentIntent>}
   */
  async createPaymentIntentForAuction(
    auction: Auction,
    stripeCustomerId: string
  ): Promise<Stripe.PaymentIntent> {
    this.logger.debug(
      `NFT ${uuidFrom(auction.nft._id).toString()} is second hand: ${
        auction.isSecondary
      }`
    )

    // Throw if no user for stripeCustomerId
    const user: User = await this.getUserByStripeCustomerId(stripeCustomerId)
    if (!user) {
      const message = `User with Stripe Customer ID ${stripeCustomerId} not found`
      this.logger.error(`[createPaymentIntentForAuction] ${message}`)
      throw new NotFoundException(message)
    }

    // Throw if no avnPubKey for user
    if (!user.avnPubKey) {
      const message = `AvnPubKey not found for user ${uuidFrom(
        user._id
      ).toString()}`
      this.logger.error(`[createPaymentIntentForAuction] ${message}`)
      throw new NotFoundException(`${message}`)
    }

    // Factoring payment intent
    const params: Stripe.PaymentIntentCreateParams = {
      payment_method_types: ['card'],
      amount: BigNumber.from(auction.reservePrice).toNumber(),
      currency: 'usd',
      capture_method: 'manual',
      customer: stripeCustomerId,
      metadata: { auction: uuidFrom(auction._id).toString() }
    }

    // If the NFT is on a second-hand sale
    // get the seller's stripeAccountId to use it createPaymentIntentForBid
    if (auction.isSecondary) {
      // Throw if no seller
      const seller = await this.getUserById(auction.seller._id)
      if (!seller) {
        throw new NotFoundException('Auction seller not found')
      }

      // Throw if the seller has no stripeAccountId
      const sellerStripeAccountId = seller.stripeAccountId
      if (!sellerStripeAccountId) {
        const message = `[createPaymentIntentForAuction] User ${uuidFrom(
          auction.seller._id
        ).toString()} has no Stripe Account ID`
        this.logger.error(message)
        throw new BadRequestException(message)
      }

      this.logger.log(
        `[createPaymentIntentForAuction] Seller has a stripe connected account ${sellerStripeAccountId}`
      )

      // Get the platform fee to apply it to this bid
      const platformFee = await this.listingService.calculateFeesTotal(
        auction.reservePrice,
        auction.nft._id
      )

      // Apply the platform fee to the payment intent
      if (sellerStripeAccountId) {
        this.applyPlatformFeeToPaymentIntent(
          params,
          platformFee,
          sellerStripeAccountId
        )
      } else {
        this.logger.log(
          `[createPaymentIntentForAuction] Payment intent is not a second hand sale`
        )
      }

      this.logger.log(
        `[createPaymentIntentForAuction] The NFT price is "${auction.reservePrice}" and the platform fee will be "${platformFee}"`
      )
    }

    // Create the payment intent
    const paymentIntent = await this.stripe.paymentIntents.create(params)

    return paymentIntent
  }

  /**
   * Connect Payment Method to Payment Intent
   * @param paymentMethodId
   * @param paymentIntentId
   * @returns {Promise<Stripe.PaymentIntent>}
   */
  async connectPaymentMethodToIntent(
    paymentMethodId: string,
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.update(paymentIntentId, {
      payment_method: paymentMethodId
    })
  }
}
