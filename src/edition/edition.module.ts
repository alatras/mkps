import { forwardRef, Module } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { EditionController } from './controllers/edition.controller'
import { EditionService } from './edition.service'
import { MongooseModule } from '@nestjs/mongoose'
import { NftEdition, NftEditionSchema } from './schemas/edition.schema'
import { Nft, NftSchema } from '../nft/schemas/nft.schema'
import { EditionListingModule } from '../edition-listing/edition-listing.module'
import { DbCollections } from '../shared/enum'
import { NftModule } from '../nft/nft.module'
import { LogModule } from '../log/log.module'
import { ConfigService } from '@nestjs/config'
import appConfig from '../config/app.config'

@Module({
  imports: [
    forwardRef(() => NftModule),
    LogModule,
    EditionListingModule,
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
      }
    ])
  ],
  controllers: [EditionController],
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
