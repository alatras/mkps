import { IsOptional, IsString, ValidateNested } from 'class-validator'
import { Exclude, Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { AuctionStatus, Currency } from '../../shared/enum'
import { Prop } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { AuctionType } from '../../shared/enum'
import { User } from '../../user/schemas/user.schema'
import { DataWrapper } from '../../common/dataWrapper'
import { Auction } from '../../listing/schemas/auction.schema'

export class Seller {
  @Transform(({ value }) => MUUID.from(value).toString())
  @ApiProperty({ required: true })
  @IsString()
  id: string

  @IsString()
  @ApiProperty({ required: true })
  avnPubKey: string

  @IsString()
  @ApiProperty({ required: true })
  username: string

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  ethAddress?: string
}

export class ListNftDto {
  @IsString()
  @ApiProperty({ required: true })
  nftId: string

  @Prop()
  @IsString()
  @IsOptional()
  anvNftId?: string

  @ValidateNested()
  @Type(() => Seller)
  @ApiProperty({ required: true })
  seller: Seller

  @ApiProperty({ required: true })
  @IsString()
  reservePrice: string

  @ApiProperty({ required: true })
  @IsString()
  endTime: string

  @ApiProperty({
    required: true,
    type: String,
    enum: Object.values(AuctionType)
  })
  @IsString()
  type: AuctionType

  // For Airdrop and FreeClaim Auctions
  @IsOptional()
  @IsString()
  requestId?: string

  // Airdrop or Free claim = NONE
  // Stripe = USD
  // ETH = ETH
  @ApiProperty({
    required: true,
    type: String,
    enum: Object.values(Currency)
  })
  @IsString()
  currency: Currency

  @Prop({
    type: String,
    enum: Object.values(AuctionStatus),
    required: false
  })
  status?: AuctionStatus

  @ValidateNested()
  @Type(() => User)
  @Prop({ required: false })
  winner?: User
}

@Exclude()
export class ListNftResponseDto extends DataWrapper<Auction> {}
