import { IsString, Matches } from 'class-validator'
import { Exclude } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { DataWrapper } from '../../common/dataWrapper'
import { Auction } from '../../listing/schemas/auction.schema'
import { AuctionStatus, AuctionType, Currency } from '../../shared/enum'
import { Bid } from '../../payment/schemas/bid.dto'
import { uuidFrom } from '../../utils'
import { formatCurrencyWithSymbol } from '../../utils/format-currency'

export class CancelListingDto {
  @ApiProperty({ required: true })
  @IsString()
  @Matches(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/, {
    message: 'auctionId should be UUID'
  })
  auctionId: string
}

class AuctionSellerResponse {
  @ApiProperty({ required: true })
  id: string

  @ApiProperty({ required: false })
  avnPubKey?: string

  @ApiProperty({ required: false })
  username?: string

  @ApiProperty({ required: false })
  avatarUrl?: string
}

class StripePayment {
  paymentMethodId: string | null
  paymentIntentId: string | null
  captured: boolean
  failed?: boolean
  canceled?: boolean
}

class Owner {
  id: string
  avnPubKey?: string
  ethAddress?: string
  username?: string
}

class ListingOptions {
  canWithdraw: boolean
  canView?: boolean
}

class CancelListingResponseAuction {
  @ApiProperty({ required: true })
  id: string

  @ApiProperty({ required: true })
  nft: {
    id: string
    eid: string
    avnNftId?: string
  }

  @ApiProperty({ required: true })
  seller: AuctionSellerResponse

  @ApiProperty({
    required: true,
    type: String,
    enum: Object.values(Currency)
  })
  @IsString()
  currency: Currency

  @ApiProperty({ required: true })
  reservePrice: string

  @ApiProperty({ required: true })
  endTime: Date

  @ApiProperty({ required: true })
  isSecondary: boolean

  @ApiProperty({
    required: true,
    type: String,
    enum: Object.values(AuctionType)
  })
  @IsString()
  type: AuctionType

  @ApiProperty({ required: false })
  sale?: {
    value: string
    owner: Owner
    stripe?: StripePayment
    soldAt?: Date
  }

  @ApiProperty({ required: false })
  winner?: Bid

  @ApiProperty({ required: false })
  unlockableContentClaimedAt?: Date

  @ApiProperty({ required: true })
  displayReservePrice: string

  @ApiProperty({ required: false })
  listingOptions?: ListingOptions

  @ApiProperty({ required: true })
  status: AuctionStatus

  @ApiProperty({ required: false })
  hasBids: boolean

  @ApiProperty({ required: false })
  hasSale: boolean

  @ApiProperty({ required: false })
  hasEnded: boolean

  @ApiProperty({ required: false })
  secondHighestBid?: Bid
}

export const cancelListingResponseAuctionFactory = (
  auction: Auction
): CancelListingResponseAuction => {
  const response = new CancelListingResponseAuction()

  response.id = uuidFrom(auction._id).toString()

  response.currency = auction.currency
  response.reservePrice = auction.reservePrice
  response.endTime = auction.endTime
  response.isSecondary = auction.isSecondary
  response.type = auction.type ?? AuctionType.highestBid
  response.displayReservePrice = formatCurrencyWithSymbol(
    auction.reservePrice,
    auction.currency
  )
  response.status = auction.status

  response.seller = {
    id: uuidFrom(auction.seller._id).toString(),
    avnPubKey: auction.seller.avnPubKey
  }

  response.nft = {
    id: uuidFrom(auction.nft._id).toString(),
    eid: auction.nft.avnNftId
  }

  if (auction.sale?.owner) {
    response.sale = {
      ...auction.sale,
      owner: {
        ...auction.sale.owner,
        id: uuidFrom(auction.sale.owner._id).toString()
      }
    }
  }

  return response
}

@Exclude()
export class CancelListingNftResponseDto extends DataWrapper<CancelListingResponseAuction> {}
