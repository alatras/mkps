import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
// import { from } from 'uuid-mongodb'
import { CreateNftDto } from './dto/nft.dto'
import { Nft, NftStatus } from './schemas/nft.schema'
import { EditionService } from '../edition/edition.service'
import { NftHistory } from './schemas/nft-history.schema'
import { HistoryType } from '../shared/enum/historyType'
import { from as _uuidFrom } from 'uuid-mongodb'
import { uuidFrom } from '../utils'

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
      owner: _uuidFrom(userId),
      status: NftStatus.draft,
      minterId: _uuidFrom(userId)
    }

    return await this.nftModel.create(nftDraft)
  }

  async findOneById(id: string): Promise<Nft> {
    return this.nftModel.findOne({ _id: uuidFrom(id) }).lean()
  }

  async updateOneById(id: string, updatedValues: Partial<Nft>) {
    return await this.nftModel.findOneAndUpdate(
      { _id: id },
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
      { _id: id },
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

  async addHistoryMinted(
    historyParams: Omit<NftHistory, 'type'>
  ): Promise<NftHistory> {
    const doc: NftHistory = {
      ...historyParams,
      type: HistoryType.minted
      // TODO test check createdAt and updatedAt
    }
    //
    const history = doc.transactionHash
      ? await this.nftHistoryModel.findOne<NftHistory>({
          transactionHash: doc.transactionHash
        })
      : null

    if (history == null) {
      await this.nftHistoryModel.create(doc)
    } else {
      const { createdAt: _, ...docUpdated } = doc
      await this.nftHistoryModel.updateOne(
        { transactionHash: doc.transactionHash },
        { $set: { ...docUpdated, updatedAt: new Date() } }
      )
    }

    return doc
  }
}
