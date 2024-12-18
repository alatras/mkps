import { Module } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { EditionController } from './controllers/edition.http-controller'
import { EditionService } from './edition.service'
import { MongooseModule } from '@nestjs/mongoose'
import { NftEdition, NftEditionSchema } from './schemas/edition.schema'
import { Nft, NftSchema } from '../nft/schemas/nft.schema'
import { DbCollections } from '../shared/enum'
import { LogModule } from '../log/log.module'
import { ConfigService } from '@nestjs/config'
import appConfig from '../config/app.config'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema,
  AvnEditionTransaction
} from '../avn-transaction/schemas/avn-transaction.schema'
import { EditionMsController } from './controllers/edition.ms-controller'

@Module({
  imports: [
    LogModule,
    MongooseModule.forFeature([
      {
        name: NftEdition.name,
        schema: NftEditionSchema,
        collection: DbCollections.Editions
      },
      {
        name: Nft.name,
        schema: NftSchema,
        collection: DbCollections.NFTs
      },
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      },
      {
        name: AvnEditionTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      }
    ])
  ],
  controllers: [EditionController, EditionMsController],
  providers: [
    EditionService,
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
  exports: [EditionService]
})
export class EditionModule {}
