import { Module, forwardRef } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { DbCollections } from '../shared/enum'
import { ListingService } from './listing.service'
import { Auction, AuctionSchema } from './schemas/auction.schema'
import { getRedisOptions } from '../utils/get-redis-options'
import { Bid, BidSchema } from '../payment/schemas/bid.dto'
import { FixedPriceService } from './fixed-price/fixed-price.service'
import { AvnTransactionModule } from '../avn-transaction/avn-transaction.module'
import { ConfigModule } from '@nestjs/config'
import { EditionListingModule } from '../edition-listing/edition-listing.module'
import { PaymentModule } from '../payment/payment.module'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [
    forwardRef(() => AvnTransactionModule),
    forwardRef(() => PaymentModule),
    ConfigModule,
    CommonModule,
    EditionListingModule,
    MongooseModule.forFeature([
      {
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      },
      {
        name: Bid.name,
        schema: BidSchema,
        collection: DbCollections.Bids
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
    FixedPriceService,
    ListingService
  ],
  exports: [ListingService, FixedPriceService]
})
export class ListingModule {}
