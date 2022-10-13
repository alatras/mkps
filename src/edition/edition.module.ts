import { Module } from '@nestjs/common'
import { EditionController } from './edition.controller'
import { EditionService } from './edition.service'
import { MongooseModule } from '@nestjs/mongoose'
import { NftEdition, NftEditionSchema } from './schemas/edition.schema'
import { Nft, NftSchema } from '../nft/schemas/nft.schema'
import { EditionListingModule } from '../edition-listing/edition-listing.module'
import { DbCollections } from 'src/shared/enum'

@Module({
  imports: [
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
  providers: [EditionService],
  exports: [EditionService]
})
export class EditionModule {}
