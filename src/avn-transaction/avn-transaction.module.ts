import { AvnTransactionHttpController } from './controllers/avn-transaction.http-controller'
import { AvnTransactionChangeStreamService } from './services/avn-transaction-change-stream.service'
import { AvnTransactionApiGatewayService } from './services/avn-transaction-api-gateway.service'
import { AvnTransactionService } from './services/avn-transaction.service'
import { MongooseModule } from '@nestjs/mongoose'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from './schemas/avn-transaction.schema'
import { DbCollections } from '../shared/enum'
import { LogModule } from '../log/log.module'
import { Module } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'

@Module({
  imports: [
    LogModule,
    MongooseModule.forFeature([
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      }
    ]),
    LogModule
  ],
  providers: [
    AvnTransactionService,
    AvnTransactionChangeStreamService,
    AvnTransactionApiGatewayService,
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
  controllers: [AvnTransactionHttpController],
  exports: [AvnTransactionService]
})
export class AvnTransactionModule {}
