import {
  forwardRef,
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
  Logger,
  InternalServerErrorException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ClientProxy } from '@nestjs/microservices'
import { CreateNftDto, CreateNftResponseDto } from '../dto/nft.dto'
import { Nft, UnlockableContent } from '../schemas/nft.schema'
import { EditionService } from '../../edition/edition.service'
import { NftHistory } from '../schemas/nft-history.schema'
import { Lock } from 'redlock'
import { firstValueFrom } from 'rxjs'
import { MUUID, v4 } from 'uuid-mongodb'
import {
  AuctionStatus,
  AuctionType,
  Currency,
  HistoryType,
  KycStatus
} from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { CreateNftHistoryDto } from '../dto/nft-history.dto'
import { NftStatus } from '../../shared/enum'
import { NftDraftContract } from '../schemas/nft-draft-contract'
import { User } from '../../user/schemas/user.schema'
import { NftDraftModel } from '../schemas/nft-draft-model'
import { ImagesSet } from '../schemas/asset.schema'
import { getNftRoyalties } from '../../utils/get-royalties'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { InvalidDataError } from '../../core/errors'
import { ListNftDto, ListNftResponseDto } from '../dto/list-nft.dto'
import { validateListingPrice } from '../../utils/validateListingPrice'
import { PaymentService } from '../../payment/services/payment.service'
import { ListingService } from '../../listing/listing.service'
import { Royalties } from '../../avn-transaction/schemas/avn-transaction.schema'
import {
  CancelListingDto,
  CancelListingNftResponseDto,
  cancelListingResponseAuctionFactory
} from '../dto/cancel-listing-of-nft.dto'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { Auction } from '../../listing/schemas/auction.schema'
import { S3Service } from '../../common/s3/s3.service'
import { getDateEmailFormat } from '../../utils/date'
import { formatCurrencyWithSymbol } from '../../utils/currency'
import { FirstBidNotificationEmailData } from '../../common/email/email-data'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { BuyNftDto, BuyNftResponseDto } from '../dto/buy-nft.dto'
import { isKycEnabled } from '../../utils/isKycEnabled'
import { StripeService } from '../../payment/stripe/stripe.service'
import { FixedPriceService } from '../../listing/fixed-price/fixed-price.service'

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name)

  constructor(
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    @InjectModel(NftHistory.name) private nftHistoryModel: Model<NftHistory>,
    private avnTransactionService: AvnTransactionService,
    @Inject(forwardRef(() => EditionService))
    private editionService: EditionService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private paymentService: PaymentService,
    private listingService: ListingService,
    private s3Service: S3Service,
    private readonly stripeService: StripeService,
    private readonly fixedPriceService: FixedPriceService
  ) {}

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

    if (
      createNftDto.unlockableContent?.quantity &&
      createNftDto.unlockableContent?.quantity < 0
    ) {
      throw new BadRequestException('negativeUnlockableContentQuantity')
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

    const royalties: Royalties[] = getNftRoyalties(nft.royalties)

    const mint = await this.avnTransactionService.mintNft(
      nft._id.toString(),
      fullUserObject,
      royalties
    )

    return { requestId: mint.request_id, id: nft._id.toString() }
  }

  /**
   * List an NFT (Auction)
   * This updates NFT status to 'Sale opening', creates an Auction,
   * adds NFT history item, and adds the listing to AVN Transactions.
   * @param user Logged in user
   * @param listNftDto
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
    const nftUUId = uuidFrom(listNftDto.nftId)
    const nft = await this.findOneById(nftUUId)
    if (!nft) {
      this.logger.debug(`NFT ${nftUUId} not found to list`)
      throw new BadRequestException('NFT not found')
    }

    // Throw if NFT has no AvN ID
    if (!nft.avnNftId) {
      this.logger.debug(`NFT ${nftUUId} has no AvN ID`)
      throw new BadRequestException('NFT has no AvN ID')
    }

    // Throw if NFT status isn't minted or owned
    if (![NftStatus.minted, NftStatus.owned].includes(nft.status)) {
      this.logger.debug(
        `NFT ${nftUUId} can't be listed because it has status: ${nft.status}`
      )
      throw new UnprocessableEntityException(
        `Cannot create auction of NFT with status: ${nft.status}`
      )
    }

    // Throw if NFT is hidden
    if (nft.isHidden) {
      this.logger.debug(`NFT ${nftUUId} can't be listed because it is hidden`)
      throw new UnprocessableEntityException('auctionOnHiddenNft')
    }

    // Throw if NFT is an edition NFT
    if (nft.status === NftStatus.minted && nft.editionId) {
      this.logger.debug(`NFT ${nftUUId} is an edition NFT`)
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
        this.logger.debug(`User ${user._id} has no connected stripe account`)
        throw new UnauthorizedException('noConnectedStripeAccount')
      }

      // Throw ir user has not completed Stripe onboarding
      const account = await this.paymentService.getAccount(user.stripeAccountId)
      if (!account.details_submitted) {
        this.logger.debug(
          `User ${user._id} has not completed Stripe onboarding`
        )
        throw new UnauthorizedException('stripeOnboardingIncomplete')
      }
    }

    // Throw if NFT is already on sale
    const existingAuction = await this.listingService.getCurrentAuctionByNftId(
      nftUUId
    )
    if (existingAuction) {
      this.logger.debug(`NFT ${nftUUId} already has an auction`)
      throw new ConflictException('alreadyOnSale')
    }

    // Throw if NFT is not allowed to be sold in the requested currency
    const isSecondarySale = await this.listingService.isNftSecondHand(nftUUId)
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
      listNftDto.status =
        listNftDto.currency === Currency.USD
          ? AuctionStatus.open
          : AuctionStatus.unconfirmed
    }

    // Set NFT status to 'Sale opening'
    await this.setStatusToNft(nftUUId, NftStatus.saleOpening)

    // Create auction
    const auction = await this.listingService.createAuction(
      {
        id: uuidFrom(fullUserObject._id).toString(),
        avnPubKey: fullUserObject.avnPubKey,
        username: fullUserObject.username
      },
      { avnNftId: nft.avnNftId, ...listNftDto },
      isSecondarySale
    )

    // Add NFT history entry
    const nftHistoryEntry: CreateNftHistoryDto = {
      nftId: listNftDto.nftId,
      userAddress: listNftDto.seller.avnPubKey,
      auctionId: auction._id,
      currency: listNftDto.currency,
      amount: listNftDto.reservePrice,
      saleType: listNftDto.type,
      type: HistoryType.listed
    }
    await this.addHistory(nftHistoryEntry)

    // List NFT with AvN trx service
    await this.avnTransactionService.listNft(
      listNftDto,
      auction,
      nft,
      fullUserObject
    )

    // Formulate response
    const responseAuction = cancelListingResponseAuctionFactory(auction)
    const cancelAuctionResponse: CancelListingNftResponseDto = {
      data: responseAuction,
      message: 'auctionCreated'
    }

    return cancelAuctionResponse
  }

  /**
   * Cancel listing of NFT.
   * This reverses the steps of the listing process.
   * It does the following:
   *  - Sets the NFT status to 'Sale closing'
   *  - sets Auction status to 'Closing'
   *  - cancels listing with AvN
   *  - sets NFT to its original status
   *  - sets the Auction to 'Withdraw'
   * @param user User
   * @param cancelListingDto Cancel listing DTO
   */
  async cancelListing(
    user: User,
    cancelListingDto: CancelListingDto
  ): Promise<CancelListingNftResponseDto> {
    const fullUserObject = await this.getUser(user._id)
    if (!fullUserObject.avnPubKey) {
      throw new InvalidDataError('AvV public key is not set for user')
    }

    const auction = await this.listingService.getAuctionById(
      uuidFrom(cancelListingDto.auctionId)
    )
    if (!auction) {
      this.logger.debug(` Auction ${cancelListingDto.auctionId} not found`)
      throw new NotFoundException('auctionNotFound')
    }

    // Throw if user is not the seller
    if (fullUserObject.avnPubKey !== auction.seller.avnPubKey) {
      this.logger.debug(
        `User ${fullUserObject._id} is not the seller of auction ${cancelListingDto.auctionId}`
      )
      throw new UnauthorizedException('notAuthorized')
    }

    // Throw if Auction is withdrawn
    if (auction.status === AuctionStatus.withdraw) {
      this.logger.debug(
        `Auction ${cancelListingDto.auctionId} is already withdrawn`
      )
      throw new ConflictException('auctionAlreadyWithdrawn')
    }

    // Throw if Auction is already closed
    if (auction.status === AuctionStatus.closing) {
      this.logger.debug(
        `Auction ${cancelListingDto.auctionId} is already closing`
      )
      throw new ConflictException('auctionAlreadyClosing')
    }

    // Throw if Auction is not open
    if (auction.status !== AuctionStatus.open) {
      this.logger.debug(`Auction ${cancelListingDto.auctionId} is not open`)
      throw new ConflictException('expiredAuction')
    }

    // Throw if NFT is not found
    const nft = await this.findOneById(uuidFrom(auction.nft._id))
    if (!nft) {
      this.logger.debug(`NFT ${auction.nft._id} not found`)
      throw new NotFoundException('nftNotFound')
    }

    // Throw if NFT is an Edition
    if (nft.status === NftStatus.minted && nft.editionId) {
      this.logger.debug(`NFT ${auction.nft._id} is an edition`)
      throw new ConflictException('editionCannotBeListed')
    }

    // Update Auction status to 'Closing'
    await this.listingService.updateAuctionStatus(
      auction._id,
      AuctionStatus.closing
    )

    // Set NFT status to 'Sale closing'
    await this.setStatusToNft(nft._id, NftStatus.saleClosing)

    // Cancel USD Auction
    if (auction.currency === Currency.USD) {
      // Cancel Auction with AvN Network
      await this.avnTransactionService.cancelFiatNftListing(
        nft,
        fullUserObject,
        auction
      )

      // Add NFT history
      const historyEntry: CreateNftHistoryDto = {
        auctionId: auction._id,
        nftId: uuidFrom(auction.nft._id).toJSON(),
        userAddress: `${user.avnPubKey}`,
        type: HistoryType.cancelled,
        currency: auction.currency,
        amount: auction.reservePrice
      }
      const nftHistory = await firstValueFrom(
        this.clientProxy.send(
          MessagePatternGenerator('nft', 'addHistory'),
          historyEntry
        )
      )
      this.logger.debug(`NFT history added/updated ${nftHistory._id}`)
    } else {
      // Cancel non USD Auction. For now all non USD Auctions handles the same way.
      await this.listingService.cancelNoneUsdAuction(auction, user)
    }

    // Formulate response
    const responseAuction = cancelListingResponseAuctionFactory(auction)
    const cancelAuctionResponse: CancelListingNftResponseDto = {
      data: responseAuction,
      message: 'auctionClosing'
    }

    return cancelAuctionResponse
  }

  /**
   * Get NFT by ID
   * @param _id NFT ID
   * @returns NFT
   */
  async findOneById(_id: MUUID): Promise<Nft> {
    return this.nftModel.findOne({ _id }).lean()
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

  async setStatusToNft(_id: MUUID, status: NftStatus): Promise<Nft> {
    this.logger.debug(`Setting status of NFT ${_id} to ${status}`)
    const nft = await this.nftModel.findOneAndUpdate(
      { _id },
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

  async addHistory(historyParams: CreateNftHistoryDto): Promise<NftHistory> {
    const history = historyParams.transactionHash
      ? await this.nftHistoryModel.findOne({
          transactionHash: historyParams.transactionHash
        })
      : null

    if (!history) {
      return await this.nftHistoryModel.create({
        ...historyParams
      })
    }

    return this.nftHistoryModel.findOneAndUpdate(
      { transactionHash: historyParams.transactionHash },
      { $set: { ...historyParams } }
    )
  }

  /**
   * Handle status of NFT after minting by adding history
   * @param nftId NFT ID
   * @param avnNftId NFT ID on AvN Network
   */
  async handleNftMinted(nftId: string, avnNftId: string) {
    const nft: Nft = await this.updateOneById(nftId, {
      avnNftId,
      eid: avnNftId,
      status: NftStatus.minted
    })

    await this.addHistory({
      nftId: nftId,
      userAddress: nft.owner.avnPubKey,
      type: HistoryType.minted
    })
  }

  /**
   * Handle status of NFT after minting by adding history
   * @param nftId NFT ID
   * @param avnNftId NFT ID on AvN Network
   */
  async handleMintFiatBatchNft(nftId: string, avnNftId: string) {
    const nft: Nft = await this.updateOneById(nftId, {
      avnNftId,
      eid: avnNftId,
      status: NftStatus.minted
    })

    await this.addHistory({
      nftId: nftId,
      userAddress: `${nft.owner.avnPubKey}`
    })
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
      unlockableContent = (await this.findOneById(uuidFrom(id)))
        ?.unlockableContent
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

  /**
   * Create NFT and insert it into DB
   * Used by NFT Service and Edition Service
   * @param nftDraft NFT draft
   * @param nftStatus NFT status
   */
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
    this.logger.debug(`Setting AvN NFT ID ${avnNftId} to NFT ${nftId}`)
    return this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(nftId) },
      {
        $set: {
          avnNftId,
          eid: avnNftId,
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

  /**
   * Get data for email related to an NFT
   * @param {Nft} nft - The NFT object to get data for
   * @param {Auction | EditionListing} listing - The auction or edition listing object for the NFT
   * @param {string} [bidValue] - Optional value for the bid
   * @returns {Promise<Object>} - Promise object representing the email data object
   * @throws {NotFoundException} - If the highest bid is not found or the listing is invalid
   * @throws {InternalServerErrorException} - If the highest bid is not set
   */
  async getNftEmailData(
    nft: Nft,
    listing: Auction | EditionListing,
    bidValue?: string
  ): Promise<FirstBidNotificationEmailData> {
    // Get the highest bid for the NFT
    const price: string = await this.getBidPriceForNotificationEmail(
      listing,
      bidValue
    )

    // Get the edition if the NFT is an edition
    const edition = nft.editionId
      ? await this.editionService.getEditionById(nft.editionId)
      : undefined

    // Get the image key for the NFT
    let imageKey = nft.image.small.key
    if (edition) {
      imageKey = await this.getImageKeyForEdition(edition)
    }

    // Factor the email data
    const emailData: FirstBidNotificationEmailData = {
      name: nft.name || edition?.name,
      url: `${process.env.WEB_APP_URL}/${
        edition ? 'edition' : 'nft'
      }/${uuidFrom(edition ? edition?._id : nft._id).toString()}`,
      imgUrl: this.s3Service.mapDistributionUrl(imageKey),
      editionNumber: nft.editionNumber,
      editionQuantity: edition?.quantity,
      isEthereum: listing.currency === Currency.ETH,
      date: getDateEmailFormat(new Date()), // listing.endTime),
      price: price
        ? formatCurrencyWithSymbol(price, listing.currency)
        : undefined,
      listingId: listing._id.toString()
    }

    return emailData
  }

  /**
   * Get price of Auction of type Highest Bid,
   * @param {Auction | EditionListing} listing - The auction or edition listing object for the NFT
   * @returns {Promise<string>} - Promise object representing the price of the highest bid
   */
  async getBidPriceForNotificationEmail(
    listing: Auction | EditionListing,
    bidValue?: string
  ): Promise<string> {
    let price: string
    switch (listing.type) {
      case AuctionType.highestBid:
        if (bidValue) {
          price = bidValue
          break
        }
        price = await this.getHighestBidPriceForNotificationEmail(listing)
        break

      case AuctionType.fixedPrice:
        price = listing.reservePrice
        break

      case AuctionType.airdrop:
      case AuctionType.freeClaim:
        price = '0'
        break

      default:
        const message = `[getBidPriceForNotificationEmail] Listing invalid for NFT ${JSON.stringify(
          listing
        )}`
        this.logger.error(message)
        throw new NotFoundException(message)
    }

    return price
  }

  /**
   * Get image key for an edition.
   * This assumes that the edition has at least one NFT.
   * @param {NftEdition} edition - The edition object to get image key for
   */
  async getImageKeyForEdition(edition: NftEdition): Promise<string> {
    const firstNft = await this.findOneById(edition.nfts[0])
    if (!firstNft) {
      const message = `[getImageKeyForEdition] Could not get first NFT for edition ${uuidFrom(
        edition.nfts[0]
      ).toString()}`
      this.logger.error(message)
      throw new NotFoundException(message)
    }

    if (!firstNft.image?.small.key) {
      throw new BadRequestException('NFT does not have small thumbnail')
    }

    return firstNft.image.small.key
  }

  /**
   * Get price of Auction of type Highest Bid,
   * This assumes that bidValue is not already given to email data factory function.
   * @param {Auction} listing - The auction object to get price for
   */
  async getHighestBidPriceForNotificationEmail(
    listing: Auction
  ): Promise<string> {
    // Throw if highest bid is not found
    const bid = await this.listingService.getBidById(listing.highestBidId)
    if (!bid) {
      const message =
        `[getHighestBidPriceForNotificationEmail] Cannot send email, ` +
        `highest bid not found on listing ${uuidFrom(listing._id).toString()}`
      this.logger.error(message)
      throw new NotFoundException(message)
    }

    // Throw if highest bid is not set
    if (!listing.highestBidId) {
      const message =
        `[getHighestBidPriceForNotificationEmail] Cannot send email, ` +
        `highest bid not set on listing ${uuidFrom(listing._id).toString()}`
      this.logger.error(message)
      throw new InternalServerErrorException(message)
    }

    return bid.value
  }

  /**
   * Buy NFT
   * @param {User} user - The user object
   * @param {BuyNftDto} buyNftDto - The DTO containing the NFT ID
   * @param {Express.Request} req - The Express request object
   * @returns {Promise<BuyNftResponseDto>} - Promise object representing the buy NFT response
   */
  async buyNft(user: User, buyNftDto: BuyNftDto): Promise<BuyNftResponseDto> {
    // Throw if user is not KYC verified
    if (
      isKycEnabled() &&
      user.provider.metadata?.kycStatus !== KycStatus.verified
    ) {
      this.logger.error(
        `[buyNft] User ${user._id} is not KYC verified and cannot buy NFT`
      )
      throw new UnauthorizedException('Not KYC verified.')
    }

    const nftUuid = uuidFrom(buyNftDto.nftId)

    // Throw if NFT does not exist
    const nft = await this.findOneById(nftUuid)
    if (!nft) {
      const message = `[buyNft] NFT not found ${buyNftDto.nftId}`
      this.logger.error(message)
      throw new NotFoundException(message)
    }

    // Acquire lock for NFT
    const lock: Lock | null = await this.stripeService.acquireBidRedlock(
      nftUuid
    )

    let auction: Auction | null
    try {
      // Get current auction by NFT ID
      auction = await this.listingService.getCurrentAuctionByNftId(nftUuid)
      if (!auction) {
        const message = `[buyNft] Auction not found for NFT ${nftUuid}`
        this.logger.error(message)
        throw new NotFoundException(message)
      }

      // Throw if user is buying their own NFT
      if (user._id.toString() === auction.seller._id.toString()) {
        const message = `[buyNft] Cannot buy own NFT ${nftUuid}`
        this.logger.error(message)
        throw new BadRequestException(message)
      }

      // Throw if auction is not of type Fixed Price
      if (auction.type !== AuctionType.fixedPrice) {
        const message = `[buyNft] Auction is not of type Fixed Price ${nftUuid}`
        this.logger.error(message)
        throw new BadRequestException(message)
      }

      // Throw if auction is not active
      if (auction.status !== AuctionStatus.open) {
        const message = `[buyNft] Auction is not active ${nftUuid}`
        this.logger.error(message)
        throw new BadRequestException(message)
      }

      // Check if the auction currency is USD and a valid payment method is available
      if (
        auction.currency === Currency.USD &&
        auction?.sale?.stripe?.paymentMethodId
      ) {
        const paymentMethod = await this.stripeService.getPaymentMethod(
          auction?.sale?.stripe?.paymentMethodId
        )

        // Throw if payment method is not found
        if (!paymentMethod) {
          const message = `[buyNft] Payment method not found ${auction?.sale?.stripe?.paymentMethodId}`
          this.logger.error(message)
          throw new NotFoundException(message)
        }

        // Throw if payment method does not belong to user
        if (paymentMethod.customer !== user.stripeCustomerId) {
          const message = `[buyNft] Payment method does not belong to user ${auction?.sale?.stripe?.paymentMethodId}`
          this.logger.error(message)
          throw new BadRequestException(message)
        }
      }

      // Create Stripe customer if auction currency is USD and user does not have a Stripe customer
      if (auction.currency === Currency.USD && !user.stripeCustomerId) {
        await this.stripeService.createStripeCustomer(user, true)
        user = await this.getUserById(user._id)
        if (!user) {
          const message = `[buyNft] User not found ${user._id} after creating Stripe customer`
          this.logger.error(message)
          throw new NotFoundException(message)
        }
      }
    } catch (error) {
      // Re-throw the error to propagate it
      throw error
    } finally {
      // Release lock
      if (lock) {
        await lock.release()
      }
    }

    // Throw if buying with wrong currency
    if (
      ![Currency.USD, Currency.ADA, Currency.ETH, Currency.NONE].includes(
        auction.currency
      )
    ) {
      const message = `Cannot buy with currency ${auction.currency}`
      this.logger.error(`[buyNft] ${message}`)
      throw new BadRequestException(message)
    }

    const { transactionHash } = buyNftDto

    switch (auction.currency) {
      case Currency.USD:
        await this.fixedPriceService.purchaseFiatNft(auction, user)
      case Currency.ETH:
        await this.fixedPriceService.purchaseEthNft(
          auction,
          transactionHash,
          auction.reservePrice
        )
      case Currency.NONE:
        this.listingService.completeFreeAuction(auction, user)
        return
    }
  }

  /**
   * Get User from user service
   * @param userId
   */
  private async getUserById(userId: MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('user', 'getUserById'),
        userId.toString()
      )
    )
  }
}
