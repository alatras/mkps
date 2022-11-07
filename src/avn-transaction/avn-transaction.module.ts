import { AvnTransactionHttpController } from './controllers/avn-transaction.http-controller'
import { AvnTransactionChangeStreamService } from './services/avn-transaction-change-stream.service'
import { AvnTransactionService } from './services/avn-transaction.service'
import { MongooseModule } from '@nestjs/mongoose'
import {
  AvnTransaction,
  AvnTransactionSchema
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
import { ConfigService } from '@nestjs/config'
import appConfig from '../config/app.config'

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AvnTransaction.name,
        schema: AvnTransactionSchema,
        collection: DbCollections.AvnTransactions
      }
    ]),
    LogModule
  ],
  providers: [
    AvnTransactionService,
    AvnTransactionChangeStreamService,
    {
      provide: 'TRANSPORT_CLIENT',
      useFactory: (): ClientProxy & Closeable => {
        const configService = new ConfigService(appConfig)

        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('app.redis.host'),
            port: configService.get<number>('app.redis.port')
          }
        })
      }
    }
  ],
  controllers: [AvnTransactionHttpController],
  exports: [AvnTransactionService]
})
export class AvnTransactionModule {}
