import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import { ClientProxy } from '@nestjs/microservices'
import {
  AvnMintTransaction,
  AvnMintNftTransactionData,
  AvnNftTransaction,
  Royalties,
  AvnMintBatchTransaction,
  AvnMintBatchTransactionData,
  AvnProcessFiatSaleTransactionData,
  AvnProcessFiatSaleTransaction
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
import { firstValueFrom } from 'rxjs'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { EditionService } from '../../edition/edition.service'
import { EmailService } from '../../common/email/email.service'
import { ListingService } from '../../listing/listing.service'

@Injectable()
export class AvnTransactionService {
  private readonly logger = new Logger(AvnTransactionService.name)

  constructor(
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private avnTransactionApiGatewayService: AvnTransactionApiGatewayService,
    private editionService: EditionService,
    private emailService: EmailService,
    @Inject(forwardRef(() => ListingService))
    private listingService: ListingService
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
      user,
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
    nft: Nft,
    user: User
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
      user,
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
      nft,
      user
    )
  }

  getAvnTransactionByRequestId = async (
    requestId: string
  ): Promise<AvnNftTransaction | null> => {
    return this.avnTransactionModel.findOne({
      $or: [{ requestId: requestId }, { request_id: requestId }]
    })
  }

  /**
   * Create AvnTransaction to mint batch NFTs
   * @param nftId NFT ID
   * @param user User
   * @returns AvnTransaction
   */
  async createMintBatchAvnTransaction(
    nftId: MUUID.MUUID,
    winner: User,
    auction?: Auction
  ): Promise<AvnNftTransaction> {
    // Throw if winner does not have avn address
    if (!winner.avnAddress) {
      throw new BadRequestException('avn public key is not set')
    }

    const nftUuid = uuidFrom(nftId).toString()

    // Throw if nft does not exist
    let nft: Nft
    try {
      nft = await firstValueFrom(
        this.clientProxy.send(MessagePatternGenerator('nft', 'findOneById'), {
          nftId: nftUuid
        })
      )
    } catch (err) {
      const message = `NFT not found for id ${nftId}. Error: ${JSON.stringify(
        err
      )}`
      this.logger.error(`[createMintBatchAvnTransaction] ${message}`)
      throw new NotFoundException(message)
    }

    // Throw if NFT is not part of an edition
    if (!nft.editionId) {
      const message = `NFT ${nftId} does not have editionId`
      this.logger.error(`[createMintBatchAvnTransaction] ${message}`)
      throw new BadRequestException(message)
    }

    // Throw if edition does not exist
    const edition = await this.editionService.getEditionById(nft.editionId)
    if (!edition) {
      const message = `Edition not found for id ${nft.editionId}`
      this.logger.error(`[createMintBatchAvnTransaction] ${message}`)
      throw new NotFoundException(message)
    }

    const requestId = `avnMint:${nftUuid}`

    // Throw if AvnTransaction already exists
    const existingAvnTransaction = await this.avnTransactionModel.findOne({
      request_id: requestId,
      type: AvnTransactionType.AvnMintFiatBatchNft
    })
    if (existingAvnTransaction) {
      const message = `AvnTransaction already exists for id ${requestId}`
      this.logger.error(`[createMintBatchAvnTransaction] ${message}`)
      throw new ConflictException(message)
    }

    // Create AvnTransaction doc
    const data: AvnMintBatchTransactionData = {
      unique_external_ref: nftUuid,
      userId: nft.owner._id,
      buyer_avn_address: winner.avnAddress,
      batch_id: edition.avnId!,
      totalSupply: edition.quantity,
      index: nft.editionNumber!
    }
    const newDoc: AvnMintBatchTransaction = {
      request_id: requestId,
      type: AvnTransactionType.AvnMintFiatBatchNft,
      data: data,
      state: AvnTransactionState.NEW,
      history: []
    }
    const newAvnTransaction = await this.avnTransactionModel.create(newDoc)

    if (auction && auction.type !== AuctionType.airdrop) {
      await this.emailService.sendTransferredWinnerNotification(
        auction,
        winner._id,
        nft
      )
    }

    return newAvnTransaction
  }

  /**
   * Complete auction on AvN.
   * This will create a new AvnTransaction doc to process the sale on AvN.
   * The result is handled by ChangeStream.
   * @param nftId NFT ID
   * @param user User
   */
  async completeAuctionOnAvn(
    nft: Nft,
    winner: User,
    saleValue: string
  ): Promise<AvnNftTransaction> {
    if (!winner.avnPubKey) {
      const message = `Winner ${winner._id} does not have AvN public key`
      this.logger.error(`[completeAuctionOnAvn] ${message}`)
      throw new BadRequestException(message)
    }

    // Throw if NFT is already on sale
    const existingAuction = await this.listingService.getCurrentAuctionByNftId(
      nft._id
    )
    const nftId = uuidFrom(nft._id).toString()
    if (existingAuction) {
      this.logger.debug(`NFT ${nftId} already has an auction`)
      throw new ConflictException('alreadyOnSale')
    }

    const data: AvnProcessFiatSaleTransactionData = {
      saleValue,
      nft_id: nft.eid,
      userId: nft.owner._id,
      new_owner: winner.avnPubKey
    }

    const newDoc: AvnProcessFiatSaleTransaction = {
      request_id: `avnMint:${nftId}`,
      type: AvnTransactionType.AvnProcessFiatSale,
      data: data,
      state: AvnTransactionState.NEW,
      history: []
    }

    return await this.avnTransactionModel.create(newDoc)
  }
}
