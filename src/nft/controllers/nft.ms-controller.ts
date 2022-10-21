import { Controller, Body } from '@nestjs/common'
import { NftService } from '../services/nft.service'
import { CreateNftDto, NftResponseDto } from '../dto/nft.dto'
import { User } from '../../user/schemas/user.schema'
import { from, MUUID } from 'uuid-mongodb'
import { MessagePattern } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'

@Controller()
export class NftMsController {
  constructor(private readonly nftService: NftService) {}

  /*
    TODO:
   *   - set NFT eid
   *   - set NFT status to `minted`
   *   - create minted history
   * */
  @MessagePattern(MessagePatternGenerator('nft', 'handleNftMinted'))
  async handleNftMinted(@Body() handleNftMintedDTO: any): Promise<void> {
    console.log('Here1', handleNftMintedDTO)
  }
}
