import { Controller, Body } from '@nestjs/common'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { EventPattern } from '@nestjs/microservices'
import { NftService } from '../services/nft.service'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { Permissions } from '../../auth/decorators/permissions.decorator'

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

  @Permissions('read:nfts')
  @MessagePattern(MessagePatternGenerator('nft', 'getNftById'))
  async getUserById(@Payload('nftId') nftId: string) {
    return await this.nftService.findOneById(nftId)
  }
}
