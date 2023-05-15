import { Module } from '@nestjs/common'
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

@Module({
  imports: [
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
    ListingService,
    {
      provide: 'TRANSPORT_CLIENT',
      useFactory: (): ClientProxy & Closeable => {
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: getRedisOptions()
        })
      }
    }
  ]
})
export class ListingModule {}
