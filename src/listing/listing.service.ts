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
  Currency,
  SecondarySaleMode
} from '../shared/enum'
import { ClientProxy } from '@nestjs/microservices'
import { Auction } from './schemas/auction.schema'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { FilterQuery, Model } from 'mongoose'
import { MUUID, v4 } from 'uuid-mongodb'
import { ListNftDto, Seller } from '../nft/dto/list-nft.dto'
import { uuidFrom } from '../utils/uuid'
import { Nft } from '../nft/schemas/nft.schema'
import { LogService } from '../log/log.service'
import { AvnNftTransaction } from '../avn-transaction/schemas/avn-transaction.schema'

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
    listNftDto: ListNftDto & { nftAvnId: string },
    isSecondary: boolean
  ): Promise<Auction> {
    // Throw error if currency is invalid
    if (
      ![Currency.ETH, Currency.USD, Currency.NONE].includes(listNftDto.currency)
    ) {
      throw new UnprocessableEntityException('Auction malformed.')
    }

    const auction: Auction = {
      _id: v4(),
      nft: {
        _id: uuidFrom(listNftDto.nftId),
        eid: listNftDto.nftAvnId
      },
      seller: {
        _id: uuidFrom(seller.id),
        avnPubKey: seller.avnPubKey
      },
      endTime: new Date(listNftDto.endTime),
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
      currency: Currency[listNftDto.currency] ?? Currency.NONE,
      type: AuctionType[listNftDto.type] ?? AuctionType.highestBid
    }

    return await this.auctionModel.create(auction)
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
      throw new BadRequestException({
        endDate: {
          message: 'End date must be in the future',
          value: listNftDto.endTime
        }
      })
    }

    const isFixedPrice = listNftDto.type === AuctionType.fixedPrice
    const maxDays = 30
    if (!isFixedPrice && endTime > now + maxDays * 24 * 60 * 60 * 1000) {
      throw new BadRequestException({
        endDate: {
          message: 'NFTs can be auctioned for a maximum of 30 days',
          value: listNftDto.endTime
        }
      })
    }

    const minMinutes = 15
    if (endTime < now + minMinutes * 60 * 1000) {
      throw new BadRequestException({
        endDate: {
          message:
            'End time must be at least 15 minutes after listing the item for sale.',
          value: listNftDto.endTime
        }
      })
    }
  }
}
