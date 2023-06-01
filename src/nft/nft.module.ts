import { forwardRef, Module } from '@nestjs/common'
import { NftService } from './services/nft.service'
import { BullModule } from '@nestjs/bull'
import { NftHttpController } from './controllers/nft.http-controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Nft, NftSchema } from './schemas/nft.schema'
import { NftHistory, NftHistorySchema } from './schemas/nft-history.schema'
import { EditionModule } from '../edition/edition.module'
import { DbCollections } from '../shared/enum'
import { NftMsController } from './controllers/nft.ms-controller'
import { AvnTransactionModule } from '../avn-transaction/avn-transaction.module'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'
import { LogModule } from '../log/log.module'
import { ListingModule } from '../listing/listing.module'
import { PaymentModule } from '../payment/payment.module'
import { PaymentService } from '../payment/services/payment.service'
import { Auction, AuctionSchema } from '../listing/schemas/auction.schema'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from '../avn-transaction/schemas/avn-transaction.schema'
import { Bid, BidSchema } from '../payment/schemas/bid.dto'
import { StripeService } from '../payment/stripe/stripe.service'
import { Auth0Service } from '../user/auth0.service'
import { S3Service } from '../common/s3/s3.service'
import { EmailService } from '../common/email/email.service'
import { BullMqService, MAIN_BULL_QUEUE_NAME } from '../bull-mq/bull-mq.service'

@Module({
  imports: [
    PaymentModule,
    LogModule,
    ListingModule,
    AvnTransactionModule,
    BullModule.registerQueue({
      name: MAIN_BULL_QUEUE_NAME
    }),
    forwardRef(() => EditionModule),
    MongooseModule.forFeature([
      {
        name: Nft.name,
        schema: NftSchema,
        collection: DbCollections.NFTs
      },
      {
        name: Bid.name,
        schema: BidSchema,
        collection: DbCollections.Bids
      },
      {
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      },
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      },
      {
        name: NftHistory.name,
        schema: NftHistorySchema,
        collection: DbCollections.NftHistory
      }
    ]),
    ListingModule,
    PaymentModule
  ],
  controllers: [NftHttpController, NftMsController],
  providers: [
    NftService,
    StripeService,
    PaymentService,
    Auth0Service,
    S3Service,
    EmailService,
    BullMqService,
    {
      provide: 'TRANSPORT_CLIENT',
      useFactory: (): ClientProxy & Closeable => {
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: getRedisOptions()
        })
      }
    }
  ],
  exports: [NftService]
})
export class NftModule {}
