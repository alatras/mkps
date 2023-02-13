import { Controller } from '@nestjs/common'
import { NftService } from '../services/nft.service'
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { Nft } from '../schemas/nft.schema'
import { NftStatus } from '../../shared/enum'

@Controller()
export class NftMsController {
  constructor(private readonly nftService: NftService) {}

  @EventPattern(MessagePatternGenerator('nft', 'handleNftMinted'))
  async handleNftMinted(
    @Payload()
    payload: {
      nftId: string
      eid: string
    }
  ): Promise<void> {
    await this.nftService.handleNftMinted(payload.nftId, payload.eid)
  }

  @MessagePattern(MessagePatternGenerator('nft', 'findOneById'))
  async findOneById(@Payload() payload: { nftId: string }) {
    return await this.nftService.findOneById(payload.nftId)
  }

  @MessagePattern(MessagePatternGenerator('nft', 'setStatusToNft'))
  async updateNft(
    @Payload() payload: { nftId: string; nftStatus: NftStatus }
  ): Promise<Nft> {
    return await this.nftService.setStatusToNft(
      payload.nftId,
      payload.nftStatus
    )
  }
}
