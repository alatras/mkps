import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EditionListingStatus } from '../../shared/enum'
import { EditionListing } from '../schemas/edition-listing.schema'
import { MUUID } from 'uuid-mongodb'

@Injectable()
export class EditionListingService {
  constructor(
    @InjectModel(EditionListing.name)
    private editionListingModel: Model<EditionListing>
  ) {}

  async getPreviousListingForEdition(
    editionId: string,
    status?: EditionListingStatus
  ): Promise<EditionListing | null> {
    const filter = { 'edition._id': editionId, status: undefined }

    if (status) {
      filter.status = status
    }

    const listings = await this.editionListingModel
      .find(filter, { sort: { createdAt: -1 }, limit: 1 })
      .lean()

    return listings[0]
  }

  /**
   * Update Edition Listing
   */
  async updateEditionListing(
    editionListingId: MUUID,
    update: Partial<EditionListing>
  ): Promise<EditionListing> {
    return await this.editionListingModel
      .findByIdAndUpdate(editionListingId, update, { new: true })
      .lean()
  }
}
