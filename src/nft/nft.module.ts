import { forwardRef, Module } from '@nestjs/common'
import { NftService } from './services/nft.service'
import { NftHttpController } from './controllers/nft.http-controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Nft, NftSchema } from './schemas/nft.schema'
import { NftHistory, NftHistorySchema } from './schemas/nft-history.schema'
import { EditionModule } from '../edition/edition.module'
import { DbCollections } from '../shared/enum'
import { NftMsController } from './controllers/nft.ms-controller'
import { AvnTransactionModule } from '../avn-transaction/avn-transaction.module'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'
import { LogModule } from '../log/log.module'
import { ListingModule } from 'src/listing/listing.module'
import { PaymentModule } from 'src/payment/payment.module'
import { PaymentService } from 'src/payment/payment.service'
import { ListingService } from 'src/listing/listing.service'

@Module({
  imports: [
    LogModule,
    AvnTransactionModule,
    forwardRef(() => EditionModule),
    MongooseModule.forFeature([
      {
        name: Nft.name,
        schema: NftSchema,
        collection: DbCollections.NFTs
      },
      {
        name: NftHistory.name,
        schema: NftHistorySchema,
        collection: DbCollections.NftHistory
      }
    ]),
    ListingModule,
    PaymentModule
  ],
  controllers: [NftHttpController, NftMsController],
  providers: [
    NftService,
    PaymentService,
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
  ],
  exports: [NftService]
})
export class NftModule {}
