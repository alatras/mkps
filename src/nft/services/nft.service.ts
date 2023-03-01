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
import { AuctionStatus, Currency, HistoryType } from '../../shared/enum'
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
import { validateListingPrice } from 'src/utils/validateListingPrice'
import { PaymentService } from 'src/payment/payment.service'
import { ListingService } from 'src/listing/listing.service'
import { DataWrapper } from 'src/common/dataWrapper'

@Injectable()
export class NftService {
  private log: LoggerService

  constructor(
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    @InjectModel(NftHistory.name) private nftHistoryModel: Model<NftHistory>,
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

    const mint = await this.avnTransactionService.createMintAvnTransaction(
      nft._id.toString(),
      fullUserObject
    )

    return { requestId: mint.request_id }
  }

  /**
   * Mint an NFT.
   * This lists the NFT locally and sends listing to AVN Transaction.
   * @param user Logged in user
   * @param createNftDto Request body
   */
  async list(user: User, listNftDto: ListNftDto): Promise<ListNftResponseDto> {
    validateListingPrice(listNftDto)

    const nftUUId = uuidFrom(listNftDto.nft.id)
    const nft = await this.findOneById(nftUUId.toString())
    if (!nft) {
      throw new BadRequestException('NFT not found')
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

    // If NFT is listed in USD and never been on sale before
    if (
      listNftDto.currency === Currency.USD &&
      nft.status !== NftStatus.minted
    ) {
      // Based on: if NFT status is 'minted' it has never been on sale before.
      // This checks if it's a secondary NFT sale in USD

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

    // Is NFT on 2nd sale?
    const isSecondary = await this.listingService.isNftSecondHand(
      uuidFrom(listNftDto.nft.id)
    )

    // Check if NFT is allowed to be sold in the requested currency
    this.listingService.checkAllowedSaleCurrency(listNftDto, isSecondary, nft)

    // Validate auction close date currency is not ETH
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

    // Create auction
    const auction = await this.listingService.createAuction(
      { _id: user._id, avnPubKey: user.avnPubKey, username: user.username },
      listNftDto,
      isSecondary
    )

    return new DataWrapper({ data: auction, message: 'auctionCreated' })
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

  private async getUser(userId: MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'getUserById'), {
        userId: userId.toString()
      })
    )
  }
}
