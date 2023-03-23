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
import { ListingModule } from '../listing/listing.module'
import { PaymentModule } from '../payment/payment.module'
import { PaymentService } from '../payment/payment.service'
import { ListingService } from '../listing/listing.service'
import { Auction, AuctionSchema } from '../listing/schemas/auction.schema'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from '../avn-transaction/schemas/avn-transaction.schema'
import { AvnTransactionService } from '../avn-transaction/services/avn-transaction.service'

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
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      },
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
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
    AvnTransactionService,
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
