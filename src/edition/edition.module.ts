import { Module } from '@nestjs/common'
import { EditionController } from './edition.controller'
import { EditionService } from './edition.service'
import { MongooseModule } from '@nestjs/mongoose'
import { NftEdition, NftEditionSchema } from './schemas/edition.schema'
import { Nft, NftSchema } from '../nft/schemas/nft.schema'
import { EditionListingModule } from '../edition-listing/edition-listing.module'

@Module({
  imports: [
    EditionListingModule,
    MongooseModule.forFeature([
      {
        name: NftEdition.name,
        schema: NftEditionSchema,
        collection: 'editions'
      },
      {
        name: Nft.name,
        schema: NftSchema,
        collection: 'nfts'
      }
    ])
  ],
  controllers: [EditionController],
  providers: [EditionService],
  exports: [EditionService]
})
export class EditionModule {}
