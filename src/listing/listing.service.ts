import {
  Inject,
  BadRequestException,
  Injectable,
  UnprocessableEntityException
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import {
  AuctionStatus,
  AuctionType,
  AvnTransactionState,
  AvnTransactionType,
  Currency,
  HistoryType,
  Market,
  NftStatus,
  SecondarySaleMode
} from 'src/shared/enum'
import { firstValueFrom } from 'rxjs'
import { ClientProxy } from '@nestjs/microservices'
import { Auction } from './schemas/auction.schema'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { FilterQuery, Model } from 'mongoose'
import { MUUID, v4 } from 'uuid-mongodb'
import { ListNftDto, Seller } from 'src/nft/dto/list-nft.dto'
import { uuidFrom } from 'src/utils/uuid'
import { Nft } from 'src/nft/schemas/nft.schema'
import { LogService } from '../log/log.service'
import { MessagePatternGenerator } from '../utils/message-pattern-generator'
import { CreateNftHistoryDto } from 'src/nft/dto/nft-history.dto'
import { ListAvnTransactionDto } from 'src/avn-transaction/dto/mint-avn-transaction.dto'
import { AvnNftTransaction } from 'src/avn-transaction/schemas/avn-transaction.schema'

@Injectable()
export class ListingService {
  private log: LoggerService

  constructor(
    @InjectModel(Auction.name) private auctionModel: Model<Auction>,
    @InjectModel(AvnNftTransaction.name)
    private avnNftTransactionModel: Model<AvnNftTransaction>,
    private configService: ConfigService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  /**
   * Create a new auction
   * @param seller Seller
   * @param listNftDto ListNftDto
   * @param isSecondary Is secondary
   */
  async createAuction(
    seller: Seller,
    listNftDto: ListNftDto,
    isSecondary: boolean
  ): Promise<Auction> {
    const auction: Auction = {
      _id: v4(),
      nft: {
        _id: uuidFrom(listNftDto.nft.id),
        eid: listNftDto.nft.eid
      },
      seller: {
        _id: seller._id,
        avnPubKey: seller.avnPubKey
      },
      endTime: listNftDto.endTime,
      isSecondary,
      // We only set the winner for FreeClaim to prevent claiming twice
      ...(listNftDto.type === AuctionType.freeClaim &&
        listNftDto.winner && {
          winner: {
            _id: uuidFrom(listNftDto.winner._id),
            avnPubKey: listNftDto.winner.avnPubKey
          }
        }),
      highestBidId: null,
      status: listNftDto.status,
      reservePrice: listNftDto.reservePrice,
      currency: listNftDto.currency,
      type: listNftDto.type ?? AuctionType.highestBid
    }

    switch (listNftDto.currency) {
      case Currency.ETH:
        return await this.handleNewEthAuction(
          auction,
          auction.nft._id.toString()
        )
      case Currency.USD:
      case Currency.NONE:
        return await this.handleNewFiatOrFreeAuction(auction, seller)
      default:
        throw new UnprocessableEntityException('Auction malformed.')
    }
  }

  /**
   * Gets auction that bidder can still bid on.
   * Not withdrawn, not ended, and not sold
   * @param nftId NFT ID
   */
  async getCurrentAuctionByNftId(nftId: MUUID): Promise<Auction> {
    const statuses = [AuctionStatus.open, AuctionStatus.unconfirmed]

    return this.auctionModel
      .findOne({
        'nft._id': nftId,
        status: { $in: statuses }
      })
      .sort({
        createdAt: -1
      })
  }

  /**
   * Returns true if the nft has already been purchased before, false if not.
   * @param nftId The id of the NFT to check.
   * @param auctionId
   */
  async isNftSecondHand(nftId: MUUID): Promise<boolean> {
    const query: FilterQuery<Auction> = {
      'nft._id': nftId,
      status: AuctionStatus.sold
    }
    const auctionItem = await this.auctionModel.findOne(query)
    return Boolean(auctionItem)
  }

  /**
   * Checks if the currency of the NFT is allowed to be sold.
   * @param listNftDto list NFT DTO
   * @param isSecondary is secondary sale
   * @param nftObject NFT object
   * @throws BadRequestException if is not allowed
   */
  checkAllowedSaleCurrency(
    listNftDto: ListNftDto,
    isSecondary: boolean,
    nftObject: Nft
  ): void {
    const secondarySaleMode = this.configService.get<string>(
      'app.secondarySaleMode'
    )
    // Pass if not a secondary sale or secondary sale mode is not set
    if (!secondarySaleMode || !isSecondary) {
      return
    }

    // Throw if no secondary sale allowed
    if (secondarySaleMode === SecondarySaleMode.none) {
      throw new BadRequestException(
        { value: { message: 'noSecondarySales' } },
        'Validation failed'
      )
    }

    // Throw if listing currency doesn't match NFT primary sale currency
    if (
      // Refactor to use getPaymentProvidersForNft because
      // it may be wrong to check 1 to 1 currency (we could have more crypto)
      secondarySaleMode === SecondarySaleMode.match_primary &&
      listNftDto.currency !== Currency.NONE &&
      nftObject.primarySaleCurrency !== Currency.NONE &&
      nftObject.primarySaleCurrency !== listNftDto.currency
    ) {
      throw new BadRequestException(
        {
          value: { message: 'matchPrimaryCurrency', value: listNftDto.currency }
        },
        'Validation failed'
      )
    }
  }

  /**
   * Validates the auction close date.
   * @param listNftDto list NFT DTO
   * @throws BadRequestException if the date is invalid
   */
  validateAuctionCloseDate(listNftDto: ListNftDto): void {
    const endTime = new Date(listNftDto.endTime).getTime()
    const now = Date.now()
    if (endTime < now) {
      throw new BadRequestException(
        {
          endDate: {
            message: 'pastEndTime',
            value: listNftDto.endTime
          }
        },
        'Validation failed'
      )
    }

    const isFixedPrice = listNftDto.type === AuctionType.fixedPrice
    const maxDays = 30
    if (!isFixedPrice && endTime > now + maxDays * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        {
          endDate: {
            message: 'maximumAuctionTime',
            value: listNftDto.endTime
          }
        },
        'Validation failed'
      )
    }

    const minMinutes = 15
    if (endTime < now + minMinutes * 60 * 1000) {
      throw new BadRequestException(
        {
          endDate: {
            message: 'minimumAuctionTime',
            value: listNftDto.endTime
          }
        },
        'Validation failed'
      )
    }
  }

  /**
   * Create a new auction for ETH
   * @param newAuction new auction
   * @param nftId NFT ID
   */
  async handleNewEthAuction(
    newAuction: Auction,
    nftId: string
  ): Promise<Auction> {
    const newAuctionEth = {
      ...newAuction,
      currency: Currency.ETH
    }
    await this.auctionModel.create(newAuctionEth)
    // Set status to 'opening' and wait for Ethereum
    // "auction start" event to open it for sale
    await this.updateNftStatus(nftId, NftStatus.saleOpening)
    return newAuctionEth
  }

  /**
   * Create a new fiat or free auction
   * @param newAuction new auction
   * @param seller seller
   */
  private async handleNewFiatOrFreeAuction(
    newAuction: Auction,
    seller: Seller
  ): Promise<Auction> {
    await this.updateNftStatus(
      newAuction.nft._id.toString(),
      NftStatus.saleOpening
    )

    const nft = await this.getNft(newAuction.nft._id.toString())

    // TODO: Add auction as: await this.auctionModel.create(newAuctionEth)

    const nftHistoryEntry: CreateNftHistoryDto = {
      nftId: newAuction.nft._id.toString(),
      userAddress: seller.avnPubKey,
      auctionId: newAuction._id.toString(),
      currency: newAuction.currency,
      amount: newAuction.reservePrice,
      saleType: newAuction.type,
      type: HistoryType.listed
    }
    await this.addNftHistory(nftHistoryEntry)

    const avnListingTransaction: ListAvnTransactionDto = {
      request_id: v4().toString(),
      type: AvnTransactionType.OpenSingleNftListing,
      data: {
        nft_id: nft.eid,
        market: Market.Fiat,
        userId: seller._id,
        ethereumAddress: '', // This is only used for FIAT so it is unused
        isFixedPrice: newAuction.type === AuctionType.fixedPrice,
        endTime: new Date(newAuction.endTime).getTime() / 1000 // Convert to Unix timestamp (secs)
      },
      state: AvnTransactionState.NEW,
      history: []
    }
    await this.addNftListingToAvn(avnListingTransaction)

    return newAuction
  }

  /**
   * Update NFT status with NFT service via transporter
   * @param nftId NFT ID
   * @param nftStatus NFT status
   */
  private async updateNftStatus(
    nftId: string,
    nftStatus: NftStatus
  ): Promise<void> {
    const update = await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'setStatusToNft'), {
        nftId,
        nftStatus
      })
    )

    if (!update) {
      this.log.error(
        `[ListingService] Failed to update NFT status to ${nftStatus} for NFT ID ${nftId}`
      )
    }
  }

  /**
   * Add NFT history with NFT service via transporter
   * @param historyParams history params
   */
  private async addNftHistory(
    historyParams: CreateNftHistoryDto
  ): Promise<void> {
    const history = await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('nft', 'addHistory'),
        historyParams
      )
    )

    if (!history) {
      this.log.error(
        `[ListingService] Failed to add NFT history for NFT ID ${historyParams.nftId}`
      )
    }
  }

  /**
   * Get NFT from NFT Service via Redis.
   * @param nftId NFT ID
   */
  private async getNft(nftId: string): Promise<Nft> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'findOneById'), {
        nftId
      })
    )
  }

  /**
   * Add NFT listing to AVN
   * @param avnTransaction AVN transaction
   * @returns AVN transaction
   */
  private async addNftListingToAvn(
    avnTransaction: ListAvnTransactionDto
  ): Promise<AvnNftTransaction> {
    return await this.avnNftTransactionModel.create(avnTransaction)
  }
}
