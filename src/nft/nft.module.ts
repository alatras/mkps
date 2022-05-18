import { Module } from '@nestjs/common'
import { NftService } from './nft.service'
import { NftController } from './nft.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Nft, NftSchema } from './schemas/nft.schema'
import { NftHistory, NftHistorySchema } from './schemas/nft-history.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Nft.name,
        schema: NftSchema,
        collection: 'nfts'
      },
      {
        name: NftHistory.name,
        schema: NftHistorySchema,
        collection: 'nftHistory'
      }
    ])
  ],
  controllers: [NftController],
  providers: [NftService]
})
export class NftModule {}
