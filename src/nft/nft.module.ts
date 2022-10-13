import { Module } from '@nestjs/common'
import { NftService } from './nft.service'
import { NftController } from './nft.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Nft, NftSchema } from './schemas/nft.schema'
import { NftHistory, NftHistorySchema } from './schemas/nft-history.schema'
import { EditionModule } from '../edition/edition.module'
import { DbCollections } from '../shared/enum'

@Module({
  imports: [
    EditionModule,
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
  controllers: [NftController],
  providers: [NftService],
  exports: [NftService]
})
export class NftModule {}
