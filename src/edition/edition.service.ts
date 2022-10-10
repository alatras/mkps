import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EditionListingService } from '../edition-listing/edition-listing.service'
import { NftStatus } from '../shared/enum'
import { EditionListingStatus } from '../shared/enum/editionListingStatus'
import { NftEdition } from './schemas/edition.schema'
import { Nft } from '../nft/schemas/nft.schema'

@Injectable()
export class EditionService {
  constructor(
    @InjectModel(NftEdition.name) private nftEditionModel: Model<NftEdition>,
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    private editionListing: EditionListingService,
  ) {
  }

  async updateEditionCounts(editionId: string) {
    const previousEditionListing =
      await this.editionListing.getPreviousListingForEdition(
        editionId,
        EditionListingStatus.open,
      );

    const availableStatuses = [NftStatus.forSale];

    if (previousEditionListing) {
      availableStatuses.push(NftStatus.minted);
    }

    let availableCount = await this.nftModel.countDocuments({
      editionId: editionId,
      status: { $in: availableStatuses },
    })

    const ownedCount = await this.nftModel.countDocuments({
      editionId: editionId,
      status: { $in: [NftStatus.owned, NftStatus.saleClosing] },
    })

    if (previousEditionListing?.pendingEthereumTransactions) {
      availableCount =
        availableCount -
        previousEditionListing.pendingEthereumTransactions.length
    }

    if (previousEditionListing?.pendingBuyers) {
      availableCount =
        availableCount - previousEditionListing.pendingBuyers.length
    }

    await this.nftEditionModel.updateOne(
      { _id: editionId },
      {
        $set: {
          availableCount: Math.max(availableCount, 0),
          ownedCount: Math.max(ownedCount, 0),
          updatedAt: new Date(),
        },
      },
    )
  }
}
