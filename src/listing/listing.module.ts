import { Module } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { DbCollections } from 'src/shared/enum'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from 'src/avn-transaction/schemas/avn-transaction.schema'
import { ListingService } from './listing.service'
import { Auction, AuctionSchema } from './schemas/auction.schema'
import { getRedisOptions } from '../utils/get-redis-options'
import { LogModule } from '../log/log.module'
import { AvnTransactionModule } from 'src/avn-transaction/avn-transaction.module'
import { AvnTransactionService } from 'src/avn-transaction/services/avn-transaction.service'

@Module({
  imports: [
    LogModule,
    AvnTransactionModule,
    ListingModule,
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
