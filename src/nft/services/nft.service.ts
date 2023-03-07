import {
  forwardRef,
  Inject,
  Injectable,
  LoggerService,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  UnprocessableEntityException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model } from 'mongoose'
import { CreateNftDto, CreateNftResponseDto } from '../dto/nft.dto'
import { Nft, UnlockableContent } from '../schemas/nft.schema'
import { EditionService } from '../../edition/edition.service'
import { NftHistory } from '../schemas/nft-history.schema'
import {
  AuctionStatus,
  AuctionType,
  AvnTransactionState,
  AvnTransactionType,
  Currency,
  HistoryType,
  Market
} from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { CreateNftHistoryDto } from '../dto/nft-history.dto'
import { NftStatus } from '../../shared/enum'
import { MUUID, v4 } from 'uuid-mongodb'
import { NftWithEdition } from '../schemas/nft-with-edition'
import { NftDraftContract } from '../schemas/nft-draft-contract'
import { User } from '../../user/schemas/user.schema'
import { NftDraftModel } from '../schemas/nft-draft-model'
import { ImagesSet } from '../schemas/asset.schema'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { firstValueFrom } from 'rxjs'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { ClientProxy } from '@nestjs/microservices'
import { LogService } from '../../log/log.service'
import { InvalidDataError } from '../../core/errors'
import { ListNftDto, ListNftResponseDto } from '../dto/list-nft.dto'
import { validateListingPrice } from '../../utils/validateListingPrice'
import { PaymentService } from '../../payment/payment.service'
import { ListingService } from '../../listing/listing.service'
import { ListAvnTransactionDto } from '../../avn-transaction/dto/mint-avn-transaction.dto'
import { AvnNftTransaction } from '../../avn-transaction/schemas/avn-transaction.schema'

@Injectable()
export class NftService {
  private log: LoggerService

  constructor(
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    @InjectModel(NftHistory.name) private nftHistoryModel: Model<NftHistory>,
    @InjectModel(AvnNftTransaction.name)
    private avnNftTransactionModel: Model<AvnNftTransaction>,
    private readonly avnTransactionService: AvnTransactionService,
    @Inject(forwardRef(() => EditionService))
    private editionService: EditionService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private logService: LogService,
    private paymentService: PaymentService,
    private listingService: ListingService
  ) {
    this.log = this.logService.getLogger()
  }

  /**
   * Mint an NFT.
   * This creates the NFT locally and sends it to AVN Transaction
   * Service to be minted on the blockchain.
   * @param user Logged in user
   * @param createNftDto Request body
   * @returns request ID
   */
  async mint(
    user: User,
    createNftDto: CreateNftDto
  ): Promise<CreateNftResponseDto> {
    const fullUserObject = await this.getUser(user._id)
    if (!fullUserObject.avnPubKey) {
      throw new InvalidDataError('AvV public key is not set for user')
    }

    const newNft: NftDraftModel = {
      ...createNftDto,
      isHidden: true,
      ...(createNftDto.owner
        ? {
            owner: {
              _id: uuidFrom(fullUserObject._id),
              avnPubKey: createNftDto.owner.avnPubKey,
              username: createNftDto.owner.username
            }
          }
        : {
            owner: {
              _id: uuidFrom(fullUserObject._id),
              avnPubKey: fullUserObject.avnPubKey,
              username: fullUserObject.username
            }
          }),
      status: NftStatus.minting,
      minterId: uuidFrom(fullUserObject._id)
    }

    const nft = await this.createNft(newNft, NftStatus.minting)

    const mint = await this.avnTransactionService.mintNft(
      nft._id.toString(),
      fullUserObject
    )

    return { requestId: mint.request_id, id: nft._id.toString() }
  }

  /**
   * List an NFT (Auction)
   * This updates NFT status to 'Sale opening', creates an Auction,
   * adds NFT history item, and adds the listing to AVN Transactions.
   * @param user Logged in user
   * @param createNftDto Request body
   */
  async list(user: User, listNftDto: ListNftDto): Promise<ListNftResponseDto> {
    // Throw if listing price is invalid
    validateListingPrice(listNftDto)

    // Throw if user doesn't have an AvV public key or if it doesn't match
    const fullUserObject = await this.getUser(user._id)
    if (!fullUserObject.avnPubKey) {
      throw new BadRequestException('AvV public key is not set for user')
    }
    if (listNftDto.seller.avnPubKey !== fullUserObject.avnPubKey) {
      throw new BadRequestException('Given AvV public key does not match user')
    }

    // Throw if NFT is not found
    const nftUUId = uuidFrom(listNftDto.nft.id)
    const nft = await this.findOneById(nftUUId.toString())
    if (!nft) {
      this.log.debug(`[NftService.list] NFT ${nftUUId} not found to list`)
      throw new BadRequestException('NFT not found')
    }

    // Throw if NFT has no AvN ID
    if (!nft.avnNftId) {
      this.log.debug(`[NftService.list] NFT ${nftUUId} has no AvN ID`)
      throw new BadRequestException('NFT has no AvN ID')
    }

    // Throw if NFT status isn't minted or owned
    if (![NftStatus.minted, NftStatus.owned].includes(nft.status)) {
      this.log.debug(
        `NFT ${nftUUId} can't be listed because it has status: ${nft.status}`
      )
      throw new UnprocessableEntityException(
        `Cannot create auction of NFT with status: ${nft.status}`
      )
    }

    // Throw if NFT is hidden
    if (nft.isHidden) {
      this.log.debug(`NFT ${nftUUId} can't be listed because it is hidden`)
      throw new UnprocessableEntityException('auctionOnHiddenNft')
    }

    // Throw if NFT is an edition NFT
    if (nft.status === NftStatus.minted && nft.editionId) {
      this.log.debug(`NFT ${nftUUId} is an edition NFT`)
      throw new UnprocessableEntityException('cannotListEditionNft')
    }

    // Check Stripe if sale in USD and NFT is not a secondary NFT sale
    // (assumption: if status is 'minted' then NFT has never been on sale before)
    if (
      listNftDto.currency === Currency.USD &&
      nft.status !== NftStatus.minted
    ) {
      // Throw if user has not completed Stripe onboarding
      if (!user.stripeAccountId) {
        this.log.debug(`User ${user._id} has no connected stripe account`)
        throw new UnauthorizedException('noConnectedStripeAccount')
      }

      // Throw ir user has not completed Stripe onboarding
      const account = await this.paymentService.getAccount(user.stripeAccountId)
      if (!account.details_submitted) {
        this.log.debug(`User ${user._id} has not completed Stripe onboarding`)
        throw new UnauthorizedException('stripeOnboardingIncomplete')
      }
    }

    // Throw if NFT is already on sale
    const existingAuction = await this.listingService.getCurrentAuctionByNftId(
      nftUUId
    )
    if (existingAuction) {
      this.log.debug(`NFT ${nftUUId} already has an auction`)
      throw new ConflictException('alreadyOnSale')
    }

    // Throw if NFT is not allowed to be sold in the requested currency
    const isSecondarySale = await this.listingService.isNftSecondHand(
      uuidFrom(listNftDto.nft.id)
    )
    this.listingService.checkAllowedSaleCurrency(
      listNftDto,
      isSecondarySale,
      nft
    )

    // Throw if auction close date is invalid (for none ETH)
    if (listNftDto.currency !== Currency.ETH) {
      this.listingService.validateAuctionCloseDate(listNftDto)
    }

    // Set auction status
    if (!listNftDto.status) {
      listNftDto.status = [Currency.USD, Currency.ADA].includes(
        listNftDto.currency
      )
        ? AuctionStatus.open
        : AuctionStatus.unconfirmed
    }

    // Set NFT status to 'Sale opening'
    await this.setStatusToNft(listNftDto.nft.id, NftStatus.saleOpening)

    // Create auction
    const auction = await this.listingService.createAuction(
      {
        id: uuidFrom(fullUserObject._id).toString(),
        avnPubKey: fullUserObject.avnPubKey,
        username: fullUserObject.username
      },
      listNftDto,
      isSecondarySale
    )

    // Add NFT history entry
    const nftHistoryEntry: CreateNftHistoryDto = {
      nftId: listNftDto.nft.id,
      userAddress: listNftDto.seller.avnPubKey,
      auctionId: auction._id.toString(),
      currency: listNftDto.currency,
      amount: listNftDto.reservePrice,
      saleType: listNftDto.type,
      type: HistoryType.listed
    }
    await this.addHistory(nftHistoryEntry)

    // Add listing to AVN transactions in DB
    const listAvnTransaction: ListAvnTransactionDto = {
      request_id: v4().toString(),
      type: AvnTransactionType.OpenSingleNftListing,
      data: {
        nft_id: nft.eid,
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

    await this.avnTransactionService.listNft(listAvnTransaction)

    return { data: auction, message: 'auctionCreated' }
  }

  /**
   * Get NFT by ID
   * @param id NFT ID
   * @returns NFT
   */
  async findOneById(id: string): Promise<Nft> {
    return this.nftModel.findOne({ _id: uuidFrom(id) }).lean()
  }

  async updateOneById(id: string, updatedValues: Partial<Nft>): Promise<Nft> {
    return this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      {
        $set: {
          ...updatedValues,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )
  }

  async countNfts(filter: Record<string, any>): Promise<number> {
    return this.nftModel.countDocuments(filter)
  }

  async setStatusToNft(id: string, status: NftStatus): Promise<Nft> {
    this.log.debug(`Setting status of NFT ${id} to ${status}`)
    const nft = await this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )

    // if the NFT is part of an edition
    // we want to recalculate the counts of that edition
    if (
      nft &&
      nft.editionId &&
      ![NftStatus.draft, NftStatus.minting].includes(status)
    ) {
      await this.editionService.updateEditionCounts(nft.editionId.toString())
    }

    return nft
  }

  async addHistory(historyParams: CreateNftHistoryDto): Promise<unknown> {
    const history = historyParams.transactionHash
      ? await this.nftHistoryModel.findOne({
          transactionHash: historyParams.transactionHash
        })
      : null

    if (!history) {
      return await this.nftHistoryModel.create(
        {
          ...historyParams
        },
        { new: true }
      )
    }

    return await this.nftHistoryModel.updateOne(
      { transactionHash: historyParams.transactionHash },
      { $set: { ...historyParams } },
      { new: true }
    )
  }

  async handleNftMinted(nftId: string, eid: string) {
    const nft: Nft = await this.updateOneById(nftId, {
      eid,
      status: NftStatus.minted
    })

    await this.addHistory({
      nftId: nftId,
      userAddress: nft.owner.avnPubKey,
      type: HistoryType.minted
    })
  }

  async getNftsOfEdition(
    id: string,
    limit = 20,
    offset = 0,
    filter?: FilterQuery<Nft>,
    sort?: string | any
  ): Promise<NftWithEdition[]> {
    const nfts = await this.nftModel
      .find({ ...filter, editionId: id })
      .sort(sort)
      .skip(offset)
      .limit(limit)

    return nfts.map((n: Nft) => n as NftWithEdition)
  }

  /**
   * Maps NFT draft coming from request into NFT draft model.
   * ُEdition mint handler calls this validation.
   */
  async mapNftDraftToModel(
    contract: NftDraftContract,
    owner: User
  ): Promise<NftDraftModel> {
    const { id, ...rest } = contract
    const image = contract.image

    let unlockableContent: UnlockableContent
    if (id) {
      unlockableContent = (await this.findOneById(id))?.unlockableContent
    } else if (contract.unlockableContent) {
      unlockableContent = { ...contract.unlockableContent, claimedCount: 0 }
    }

    const ownerId = uuidFrom(owner._id)

    return {
      ...rest,
      _id: id ? uuidFrom(id) : v4(),
      owner: {
        avnPubKey: owner.avnPubKey ?? null,
        _id: ownerId
      },
      image,
      isHidden: true, // Default draft NFT to hidden
      minterId: ownerId,
      unlockableContent
    }
  }

  async createNft(
    nftDraft: NftDraftModel,
    nftStatus?: NftStatus
  ): Promise<Nft> {
    const { small, large } = nftDraft.image
    if (!small || !large) {
      throw new BadRequestException('noImages: ' + nftDraft.image)
    }

    const image: ImagesSet = {
      small: nftDraft.image.small,
      large: nftDraft.image.large,
      original: nftDraft.image.original
    }

    for (const key of Object.keys(nftDraft)) {
      if (typeof nftDraft[key] === 'string') {
        nftDraft[key] = `${nftDraft[key]}`.trim()
      }
    }

    const finalDoc: NftDraftModel = {
      ...nftDraft,
      status: nftStatus ?? NftStatus.draft,
      assets: nftDraft.assets || [],
      isHidden: nftDraft.isHidden || true,
      image,
      minterId: nftDraft.owner._id,
      unlockableContent: nftDraft.unlockableContent
        ? { ...nftDraft.unlockableContent, claimedCount: 0 }
        : undefined
    }

    return await this.nftModel.create(finalDoc)
  }

  /**
   * Update NFT with AvN NFT ID
   * @param nftId NFT ID
   * @param avnNftId AvN NFT ID
   */
  async setAvnNftIdToNft(nftId: string, avnNftId: string): Promise<Nft> {
    this.log.debug(`Setting AvN NFT ID ${avnNftId} to NFT ${nftId}`)
    return await this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(nftId) },
      {
        $set: {
          avnNftId,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )
  }

  private async getUser(userId: MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'getUserById'), {
        userId: userId.toString()
      })
    )
  }
}
