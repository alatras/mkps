import { Module } from '@nestjs/common'
import { EditionListingController } from './edition-listing.controller'
import { EditionListingService } from './edition-listing.service'
import { MongooseModule } from '@nestjs/mongoose'
import {
  EditionListing,
  EditionListingSchema
} from './schemas/edition-listing.schema'
import { DbCollections } from '../shared/enum'

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EditionListing.name,
        schema: EditionListingSchema,
        collection: DbCollections.EditionListings
      }
    ])
  ],
  controllers: [EditionListingController],
  providers: [EditionListingService],
  exports: [EditionListingService]
})
export class EditionListingModule {}
