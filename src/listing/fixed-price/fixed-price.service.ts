import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'
import { Auction } from '../schemas/auction.schema'
import { User } from '../../user/schemas/user.schema'
import { uuidFrom } from '../../utils'
import { StripeService } from '../../payment/stripe/stripe.service'
import { ListingService } from '../listing.service'
import { Currency } from '../../shared/enum'

@Injectable()
export class FixedPriceService {
  private readonly logger = new Logger(FixedPriceService.name)

  constructor(
    private readonly stripeService: StripeService,
    private readonly listingService: ListingService
  ) {}

  /**
   * Purchase an NFT with fiat
   * @param auction Auction
   * @param user User
   * @returns { hasPaymentMethod: boolean }
   */
  async purchaseFiatNft(
    auction: Auction,
    user: User
  ): Promise<{ hasPaymentMethod: boolean }> {
    // Check if auction exists
    if (!user.stripeCustomerId) {
      const message = `Customer ID not found for user ${uuidFrom(user._id)}`
      this.logger.error(`[purchaseFiatNft] ${message}`)
      throw new BadGatewayException(message)
    }

    // Create a payment intent
    let paymentIntent = await this.stripeService.createPaymentIntentForAuction(
      auction,
      user.stripeCustomerId
    )
    if (!paymentIntent) {
      const message = `Payment intent failed to create for auction ${uuidFrom(
        auction._id
      )}`
      this.logger.error(`[purchaseFiatNft] ${message}`)
      throw new InternalServerErrorException(message)
    }

    // Get payment methods
    const paymentMethods = await this.stripeService.getPaymentMethods(
      user.stripeCustomerId
    )
    if (!paymentMethods || paymentMethods.length === 0) {
      this.logger.error(
        `No payment methods found for customer ${user.stripeCustomerId}`
      )
      throw new BadRequestException(`No payment methods found`)
    }

    const paymentMethod = paymentMethods[0]

    if (paymentMethod) {
      this.logger.log(
        `[purchaseFiatNft] Connecting paymentMethodId ${paymentMethod.id} ` +
          `with paymentIntentId ${paymentIntent.id}`
      )

      // Connect payment method to payment intent
      paymentIntent = await this.stripeService.connectPaymentMethodToIntent(
        paymentMethod.id,
        paymentIntent.id
      )
      if (!paymentIntent) {
        const message = `Payment intent failed to connect to payment method ${paymentMethod.id}`
        this.logger.error(`[purchaseFiatNft] ${message}`)
        throw new InternalServerErrorException(message)
      }

      // Confirm payment intent
      await this.stripeService.confirmPaymentIntent(paymentIntent.id)

      // Set payment details on auction
      await this.listingService.setPaymentDetailsOnAuction(
        auction._id,
        paymentIntent,
        user
      )
    }

    return { hasPaymentMethod: !!paymentMethod }
  }

  purchaseEthNft = async (
    auction: Auction,
    transactionHash?: string,
    reservePrice?: string
  ) => {
    if (auction.currency !== Currency.ETH) {
      throw new Error(`Auction currency must be: ${Currency.ETH}`)
    }

    await this.listingService.updateAuctionById(auction._id, {
      endTime: new Date(),
      sale: {
        ...(auction.sale || {}),
        transactionHash,
        value: reservePrice || '0'
      }
    })
  }
}
