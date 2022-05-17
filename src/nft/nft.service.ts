import { Injectable } from '@nestjs/common'
import { CreateNftDto } from './dto/nft.dto'
import { InjectModel } from '@nestjs/mongoose'
import { Nft, NftDocument } from './schemas/nft.schema'
import { Model } from 'mongoose'

@Injectable()
export class NftService {
  constructor(@InjectModel(Nft.name) private nftModel: Model<NftDocument>) {}

  async create(createNftDto: CreateNftDto) {
    return 'This action adds a new nft'
  }
}
