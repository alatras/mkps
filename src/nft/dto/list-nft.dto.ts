import { IsDate, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Exclude, Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { AuctionStatus, Currency } from '../../shared/enum'
import { Prop } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { AuctionType } from '../../shared/enum'
import { User } from 'src/user/schemas/user.schema'
import { DataWrapper } from 'src/common/dataWrapper'
import { Auction } from 'src/listing/schemas/auction.schema'

class Nft {
  @ApiProperty({ required: true })
  @IsString()
  id: string

  @IsString()
  eid: string
}

export class Seller {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({ type: 'object', required: true })
  _id: object

  @IsString()
  @ApiProperty({ required: true })
  avnPubKey: string

  @IsString()
  @ApiProperty({ required: true })
  username: string

  @IsString()
  @ApiProperty({ required: false })
  ethAddress?: string
}

export class ListNftDto {
  @ValidateNested()
  @ApiProperty({ required: true })
  nft: Nft

  @ValidateNested()
  @Type(() => Seller)
  @ApiProperty({ required: true })
  seller: Seller

  @ApiProperty({ required: true })
  @IsString()
  reservePrice: string

  @ApiProperty({ required: true })
  @IsDate()
  endTime: Date

  @ApiProperty({ required: true })
  type: AuctionType

  @IsOptional()
  @IsString()
  requestId?: string

  @ApiProperty({
    required: true,
    type: String,
    enum: Object.values(Currency)
  })
  currency: Currency

  @Prop({
    type: String,
    enum: Object.values(AuctionStatus),
    required: false
  })
  status?: AuctionStatus

  @ValidateNested()
  @Type(() => Seller)
  @Prop({ required: false })
  winner?: User
}

@Exclude()
export class ListNftResponseDto extends DataWrapper<Auction> {}
