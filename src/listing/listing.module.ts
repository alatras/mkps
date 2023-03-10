import { Module } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { DbCollections } from '../shared/enum'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from '../avn-transaction/schemas/avn-transaction.schema'
import { ListingService } from './listing.service'
import { Auction, AuctionSchema } from './schemas/auction.schema'
import { getRedisOptions } from '../utils/get-redis-options'
import { LogModule } from '../log/log.module'
import { AvnTransactionModule } from '../avn-transaction/avn-transaction.module'
import { AvnTransactionService } from '../avn-transaction/services/avn-transaction.service'

@Module({
  imports: [
    LogModule,
    AvnTransactionModule,
    MongooseModule.forFeature([
      {
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      },
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      }
    ])
  ],
  providers: [
    ListingService,
    AvnTransactionService,
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
