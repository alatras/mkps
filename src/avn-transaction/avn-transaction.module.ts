import { AvnTransactionHttpController } from './controllers/avn-transaction.http-controller'
import { AvnTransactionApiGatewayService } from './services/avn-transaction-api-gateway.service'
import { AvnTransactionService } from './services/avn-transaction.service'
import { MongooseModule } from '@nestjs/mongoose'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from './schemas/avn-transaction.schema'
import { DbCollections } from '../shared/enum'
import { LogModule } from '../log/log.module'
import { Module, forwardRef } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'
import { HttpModule } from '@nestjs/axios'
import { Auction, AuctionSchema } from '../listing/schemas/auction.schema'
import { BullMqModule } from '../bull-mq/bull-mq.module'
import { ListingModule } from '../listing/listing.module'
import { EditionModule } from '../edition/edition.module'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [
    LogModule,
    EditionModule,
    CommonModule,
    forwardRef(() => ListingModule),
    MongooseModule.forFeature([
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      },
      {
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      }
    ]),
    HttpModule,
    BullMqModule
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
    AvnTransactionApiGatewayService,
    AvnTransactionService
  ],
  controllers: [AvnTransactionHttpController],
  exports: [AvnTransactionService, AvnTransactionApiGatewayService]
})
export class AvnTransactionModule {}
