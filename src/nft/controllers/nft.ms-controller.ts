import { Controller } from '@nestjs/common'
import { NftService } from '../services/nft.service'
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { Nft } from '../schemas/nft.schema'
import { NftStatus } from '../../shared/enum'
import { CreateNftHistoryDto } from '../dto/nft-history.dto'
import { uuidFrom } from '../../utils'
import { NftHistory } from '../schemas/nft-history.schema'
import { Auction } from '../../listing/schemas/auction.schema'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftDraftContract } from '../schemas/nft-draft-contract'
import { User } from '../../user/schemas/user.schema'
import { NftDraftModel } from '../schemas/nft-draft-model'

@Controller()
export class NftMsController {
  constructor(private readonly nftService: NftService) {}

  @EventPattern(MessagePatternGenerator('nft', 'handleNftMinted'))
  async handleNftMinted(
    @Payload()
    payload: {
      nftId: string
      avnNftId: string
    }
  ): Promise<void> {
    await this.nftService.handleNftMinted(payload.nftId, payload.avnNftId)
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

  @MessagePattern(MessagePatternGenerator('nft', 'getNftEmailData'))
  async getNftEmailData(
    @Payload()
    payload: {
      nft: Nft
      listing: Auction | EditionListing
      bidValue?: string
    }
  ) {
    return await this.nftService.getNftEmailData(
      payload.nft,
      payload.listing,
      payload.bidValue
    )
  }

  /**
   * Handle Edition NFT minted
   * @param payload NFT ID and ANV NFT ID
   */
  @EventPattern(MessagePatternGenerator('nft', 'handleMintFiatBatchNft'))
  async handleMintFiatBatchNft(
    @Payload()
    payload: {
      nftId: string
      avnNftId: string
    }
  ): Promise<void> {
    await this.nftService.handleMintFiatBatchNft(
      payload.nftId,
      payload.avnNftId
    )
  }

  /**
   * Update NFT by ID
   * @param payload NFT ID and NFT data
   * @returns Updated NFT
   */
  @EventPattern(MessagePatternGenerator('nft', 'updateNftById'))
  async updateNftById(
    @Payload()
    payload: {
      nftId: string
      nft: Partial<Nft>
    }
  ): Promise<Nft> {
    return await this.nftService.updateOneById(payload.nftId, payload.nft)
  }

  /**
   * Update NFT by ID
   * @param payload NFT ID and NFT data
   * @returns Updated NFT
   */
  @EventPattern(MessagePatternGenerator('nft', 'mapNftDraftToModel'))
  async mapNftDraftToModel(
    @Payload()
    payload: {
      contract: NftDraftContract
      owner: User
    }
  ): Promise<NftDraftModel> {
    return await this.nftService.mapNftDraftToModel(
      payload.contract,
      payload.owner
    )
  }

  /**
   * Create NFT
   * @param payload NFT data
   */
  @EventPattern(MessagePatternGenerator('nft', 'createNft'))
  async createNft(
    @Payload()
    payload: {
      nft: NftDraftModel
    }
  ): Promise<Nft> {
    return await this.nftService.createNft(payload.nft)
  }
}
