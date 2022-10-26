import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateNftDto } from '../dto/nft.dto'
import { Nft } from '../schemas/nft.schema'
import { EditionService } from '../../edition/edition.service'
import { NftHistory } from '../schemas/nft-history.schema'
import { HistoryType } from '../../shared/enum/historyType'
import { uuidFrom } from '../../utils'
import { CreateNftHistoryDto } from '../dto/nft-history.dto'
import { NftStatus } from '../../shared/enum'

@Injectable()
export class NftService {
  constructor(
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    @InjectModel(NftHistory.name) private nftHistoryModel: Model<NftHistory>,
    private editionService: EditionService
  ) {}

  async create(userId: string, createNftDto: CreateNftDto): Promise<Nft> {
    const nftDraft = {
      ...createNftDto,
      isHidden: true,
      owner: uuidFrom(userId),
      status: NftStatus.draft,
      minterId: uuidFrom(userId)
    }

    return await this.nftModel.create(nftDraft)
  }

  async findOneById(id: string): Promise<Nft> {
    return this.nftModel.findOne({ _id: uuidFrom(id) }).lean()
  }

  async updateOneById(id: string, updatedValues: Partial<Nft>): Promise<Nft> {
    return this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      {
        $set: {
          ...updatedValues,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )
  }

  async countNfts(filter: Record<string, any>): Promise<number> {
    return this.nftModel.countDocuments(filter)
  }

  async setStatusToNft(id: string, status: NftStatus): Promise<Nft> {
    const nft = await this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )

    // if the NFT is part of an edition
    // we want to recalculate the counts of that edition
    if (
      nft &&
      nft.editionId &&
      ![NftStatus.draft, NftStatus.minting].includes(status)
    ) {
      await this.editionService.updateEditionCounts(nft.editionId)
    }

    return nft
  }

  async addHistory(historyParams: CreateNftHistoryDto): Promise<void> {
    const history = historyParams.transactionHash
      ? await this.nftHistoryModel.findOne({
          transactionHash: historyParams.transactionHash
        })
      : null

    if (!history) {
      await this.nftHistoryModel.create({
        ...historyParams
      })

      return
    }

    await this.nftHistoryModel.updateOne(
      { transactionHash: historyParams.transactionHash },
      { $set: { ...historyParams } }
    )
  }

  async handleNftMinted(nftId: string, eid: string) {
    const nft: Nft = await this.updateOneById(nftId, {
      eid,
      status: NftStatus.minted
    })

    await this.addHistory({
      nftId: nftId,
      userAddress: nft.owner.avnPubKey,
      type: HistoryType.minted
    })
  }
}
