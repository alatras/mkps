import { Controller, Body } from '@nestjs/common'
import { NftService } from '../services/nft.service'
import { EventPattern, MessagePattern } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'

@Controller()
export class NftMsController {
  constructor(private readonly nftService: NftService) {}

  @EventPattern(MessagePatternGenerator('nft', 'handleNftMinted'))
  async handleNftMinted(
    @Body()
    avnTransaction: {
      nftId: string
      eid: string
    }
  ): Promise<void> {
    await this.nftService.handleNftMinted(
      avnTransaction.nftId,
      avnTransaction.eid
    )
  }

  @MessagePattern(MessagePatternGenerator('nft', 'findOneById'))
  async findOneById(@Body() input: { id: string }) {
    return await this.nftService.findOneById(input.id)
  }
}
