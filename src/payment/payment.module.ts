import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PaymentService } from './services/payment.service'
import { PaymentController } from './controllers/payment.controller'
import { ListingModule } from '../listing/listing.module'
import { Bid, BidSchema } from './schemas/bid.dto'
import { DbCollections } from '../shared/enum'
import { Auction, AuctionSchema } from '../listing/schemas/auction.schema'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'
import { StripeService } from './stripe/stripe.service'
import { Auth0Service } from '../user/auth0.service'
import { EmailService } from '../common/email/email.service'
import { CommonModule } from '../common/common.module'
import { BullMqModule } from '../bull-mq/bull-mq.module'
import { RedisService } from '../common/redis/redis.service'

@Module({
  imports: [
    forwardRef(() => ListingModule),
    CommonModule,
    BullMqModule,
    MongooseModule.forFeature([
      {
        name: Bid.name,
        schema: BidSchema,
        collection: DbCollections.Bids
      },
      {
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      }
    ])
  ],
  providers: [
    {
      provide: 'TRANSPORT_CLIENT',
      useFactory: (): ClientProxy & Closeable => {
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: getRedisOptions()
        })
      }
    },
    Auth0Service,
    EmailService,
    PaymentService,
    RedisService,
    StripeService
  ],
  controllers: [PaymentController],
  exports: [PaymentService, StripeService]
})
export class PaymentModule {}
