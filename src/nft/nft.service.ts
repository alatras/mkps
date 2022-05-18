import { Injectable } from '@nestjs/common'
import { CreateNftDto } from './dto/nft.dto'
import { InjectModel } from '@nestjs/mongoose'
import { Nft, NftDocument, NftStatus } from './schemas/nft.schema'
import { Model } from 'mongoose'
import { from } from 'uuid-mongodb'

@Injectable()
export class NftService {
  constructor(@InjectModel(Nft.name) private nftModel: Model<Nft>) {}

  async create(
    userId: string,
    createNftDto: CreateNftDto
  ): Promise<NftDocument> {
    const nftDraft = {
      ...createNftDto,
      isHidden: true,
      owner: from(userId),
      status: NftStatus.draft,
      minterId: from(userId)
    }

    return await this.nftModel.create(nftDraft)
  }
}
