import { AvnTransactionHttpController } from './controllers/avn-transaction.http-controller'
import { AvnTransactionChangeStreamService } from './services/avn-transaction-change-stream.service'
import { AvnTransactionService } from './services/avn-transaction.service'
import { UserModule } from '../user/user.module'
import { MongooseModule } from '@nestjs/mongoose'
import {
  AvnTransaction,
  AvnTransactionSchema
} from './schemas/avn-transaction.schema'
import { DbCollections } from '../shared/enum'
import { NftModule } from '../nft/nft.module'
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
    LogModule,
    NftModule,
    UserModule
  ],
  providers: [
    AvnTransactionService,
    AvnTransactionChangeStreamService,
    {
      provide: 'EVENT_CLIENT',
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
