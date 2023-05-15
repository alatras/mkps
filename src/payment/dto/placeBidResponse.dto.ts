import { ApiProperty } from '@nestjs/swagger'
import { BidStatus, Currency } from '../../shared/enum'
import { Owner } from '../../shared/sub-schemas/owner.schema'

export class PlaceBidResponseDto {
  @ApiProperty({ required: true })
  id: string

  @ApiProperty({ required: true })
  auctionId: string

  @ApiProperty({ required: true })
  owner: Owner

  // Stripe payment doesn't provide transactionHash
  @ApiProperty({ required: false })
  transactionHash?: string

  /** wei amount if eth */
  @ApiProperty({ required: true })
  value: string

  @ApiProperty({ required: true })
  currency: Currency

  @ApiProperty({ required: true })
  status: BidStatus

  @ApiProperty({ required: true })
  createdAt: Date

  @ApiProperty({ required: true })
  displayValue: string
}
