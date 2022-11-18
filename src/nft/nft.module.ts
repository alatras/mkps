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

@Module({
  imports: [
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
    ])
  ],
  controllers: [NftHttpController, NftMsController],
  providers: [NftService],
  exports: [NftService]
})
export class NftModule {}
