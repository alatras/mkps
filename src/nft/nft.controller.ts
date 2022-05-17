import { Controller, Post, Body } from '@nestjs/common'
import { NftService } from './nft.service'
import { CreateNftDto } from './dto/nft.dto'

@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Post()
  create(@Body() createNftDto: CreateNftDto) {
    return this.nftService.create(createNftDto)
  }
}
