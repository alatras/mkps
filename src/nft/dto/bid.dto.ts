import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { BidStatus, Currency } from '../../shared/enum'
import { Prop } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Owner } from '../../shared/sub-schemas/owner.schema'

export class Bid {
  @Prop()
  @IsString()
  @ApiProperty()
  preview: string

  @Prop()
  @IsNumber()
  @ApiProperty()
  @Min(0, { message: 'negative unlockable content quantity' })
  quantity: number

  @Prop()
  @IsString()
  @ApiProperty()
  details: string

  @IsNumber()
  @ApiProperty()
  @IsOptional()
  claimedCount: number

  @IsString()
  @ApiProperty()
  id: string

  @IsString()
  @ApiProperty()
  auctionId: string

  @ApiProperty({ type: Owner })
  owner: Owner

  @IsString()
  @ApiProperty({ required: false })
  transactionHash?: string

  // This is 'wei', the smallest denomination of ether.
  // An ETH is `10**18` wei.
  @IsString()
  @ApiProperty()
  value: string

  @ApiProperty({
    required: true,
    type: String,
    enum: Object.values(Currency)
  })
  @IsString()
  currency: Currency

  @ApiProperty({
    required: false,
    type: String,
    enum: Object.values(BidStatus)
  })
  @IsString()
  status: BidStatus

  @ApiProperty()
  createdAt: Date

  @IsString()
  @ApiProperty()
  displayValue: string
}
