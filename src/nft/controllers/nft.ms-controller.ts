import { Controller } from '@nestjs/common'
import { NftService } from '../services/nft.service'
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { Nft } from '../schemas/nft.schema'
import { NftStatus } from '../../shared/enum'
import { CreateNftHistoryDto } from '../dto/nft-history.dto'
import { uuidFrom } from '../../utils'
import { NftHistory } from '../schemas/nft-history.schema'

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
    return await this.nftService.findOneById(uuidFrom(payload.nftId))
  }

  @MessagePattern(MessagePatternGenerator('nft', 'setStatusToNft'))
  async setStatusToNft(
    @Payload() payload: { nftId: string; nftStatus: NftStatus }
  ): Promise<Nft> {
    return await this.nftService.setStatusToNft(
      uuidFrom(payload.nftId),
      payload.nftStatus
    )
  }

  @MessagePattern(MessagePatternGenerator('nft', 'addHistory'))
  async addHistory(
    @Payload() payload: CreateNftHistoryDto
  ): Promise<NftHistory> {
    return await this.nftService.addHistory(payload)
  }

  @MessagePattern(MessagePatternGenerator('nft', 'setAvnNftIdToNft'))
  async setAvnNftIdToNft(
    @Payload() payload: { nftId: string; avnNftId: string }
  ): Promise<Nft> {
    return await this.nftService.setAvnNftIdToNft(
      payload.nftId,
      payload.avnNftId
    )
  }
}
