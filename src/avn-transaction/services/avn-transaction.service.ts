import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import {
  AvnMintTransaction,
  AvnMintNftTransactionData,
  AvnNftTransaction,
  Royalties
} from '../schemas/avn-transaction.schema'
import { User } from '../../user/schemas/user.schema'
import {
  AuctionType,
  AvnTransactionState,
  AvnTransactionType,
  Market
} from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { AvnTransactionMintResponse } from '../response/anv-transaction-mint-response'
import { AvnTransactionApiGatewayService } from './avn-transaction-api-gateway.service'
import {
  CancelListingAvnTransactionDto,
  ListAvnTransactionDto
} from '../dto/mint-avn-transaction.dto'
import { Nft } from '../../nft/schemas/nft.schema'
import { Auction } from '../../listing/schemas/auction.schema'
import { ListNftDto } from '../../nft/dto/list-nft.dto'
import { getDefaultRoyalties } from '../../utils/get-royalties'

@Injectable()
export class AvnTransactionService {
  constructor(
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    private avnTransactionApiGatewayService: AvnTransactionApiGatewayService
  ) {}

  /**
   * Mint an NFT with AvN network.
   * Create a new doc in AvnTransactions collection to mint NFT.
   * Notify Aventus to listed the NFT and create a Proof.
   * The Proof will be used to create a auction in Ethereum.
   * @param nftId NFT ID
   * @param user Logged in user
   * @returns Avn transaction response
   */
  async mintNft(
    nftId: string,
    user: User,
    royalties?: Royalties[]
  ): Promise<AvnTransactionMintResponse> {
    if (!royalties) {
      royalties = getDefaultRoyalties()
    }

    // Create AvnTransactions doc to mint NFT
    const data: AvnMintNftTransactionData = {
      unique_external_ref:
        this.avnTransactionApiGatewayService.createExternalRef(nftId),
      userId: uuidFrom(user._id as MUUID.MUUID),
      royalties
    }
    const avnMintTransaction: AvnMintTransaction = {
      nftId,
      request_id: `avnMint:${nftId}`,
      type: AvnTransactionType.MintSingleNftApiGateway,
      data: data,
      state: AvnTransactionState.NEW,
      history: []
    }
    const avnTransaction = await this.avnTransactionModel.create(
      avnMintTransaction
    )

    // Mint NFT with AvN network
    this.avnTransactionApiGatewayService.mintSingleNft(
      nftId,
      avnTransaction.request_id,
      royalties
    )

    return avnTransaction
  }

  /**
   * List an NFT with AvN network
   * @param listNftDto List NFT DTO
   * @param auction Auction
   * @param nft NFT
   */
  async listNft(
    listNftDto: ListNftDto,
    auction: Auction,
    nft: Nft
  ): Promise<void> {
    // Create AvnTransactions doc to list NFT
    const listNftAvnTransaction: ListAvnTransactionDto = {
      nftId: nft._id.toString(),
      request_id: `avnList:${auction._id.toString()}`,
      type: AvnTransactionType.ListSingleNftListingApiGateway,
      data: {
        market: Market.Fiat,
        userId: uuidFrom(listNftDto.seller.id),
        ethereumAddress: '', // This is only used for FIAT so it is unused
        isFixedPrice: listNftDto.type === AuctionType.fixedPrice,
        endTime: new Date(listNftDto.endTime).getTime() / 1000, // Convert to Unix timestamp (secs)
        avnNftId: nft.avnNftId,
        nftId: nft._id.toString()
      },
      state: AvnTransactionState.NEW,
      history: []
    }
    await this.avnTransactionModel.create(listNftAvnTransaction)

    // List NFT in AvN network
    await this.avnTransactionApiGatewayService.listSingleNft(
      listNftAvnTransaction.data.nftId,
      listNftAvnTransaction.data.avnNftId,
      listNftAvnTransaction.request_id,
      auction
    )
  }

  /**
   * Cancel NFT fiat listing.
   * This sends a request to AvN network via API Gateway.
   * @param nft NFT
   * @param user User
   * @param auction Auction
   */
  async cancelFiatNftListing(
    nft: Nft,
    user: User,
    auction: Auction
  ): Promise<void> {
    // Create AvnTransactions doc to cancel listing NFT
    const cancelListAvnTransaction: CancelListingAvnTransactionDto = {
      nftId: nft._id.toString(),
      request_id: `avnCancelListing:${auction._id.toString()}`,
      auctionId: auction._id.toString(),
      type: AvnTransactionType.CancelListingSingleNftApiGateway,
      data: {
        nftId: nft._id.toString(),
        userId: uuidFrom(user._id),
        ethereumAddress: '',
        avnNftId: nft.avnNftId
      },
      state: AvnTransactionState.NEW,
      history: []
    }
    await this.avnTransactionModel.create(cancelListAvnTransaction)

    // Cancel listing of the NFT in AvN network
    await this.avnTransactionApiGatewayService.cancelFiatNftListing(
      cancelListAvnTransaction,
      nft
    )
  }

  getAvnTransactionByRequestId = async (
    requestId: string
  ): Promise<AvnNftTransaction | null> => {
    return await this.avnTransactionModel.findOne({ requestId: requestId })
  }
}
