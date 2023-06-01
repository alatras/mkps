import { Prop } from '@nestjs/mongoose'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'
import { Expose, Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Currency, HistoryType, PaymentStatus } from '../../shared/enum'

export class CreateNftHistoryDto {
  @Expose()
  @IsString()
  nftId: string

  @Expose()
  @IsOptional()
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    required: false
  })
  auctionId?: object

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' }
  })
  editionId?: MUUID.MUUID

  @Expose()
  @IsString()
  userAddress: string

  @Expose()
  @IsOptional()
  @IsString()
  fromAddress?: string

  @Expose()
  @IsOptional()
  @IsString()
  toAddress?: string

  @Expose()
  @IsOptional()
  @IsString()
  transactionHash?: string

  @Expose()
  @IsOptional()
  @IsEnum(HistoryType)
  type?: HistoryType

  @Expose()
  @IsOptional()
  @IsString()
  saleType?: string

  @Expose()
  @IsOptional()
  @IsString()
  currency?: string

  @Expose()
  @IsOptional()
  @IsString()
  amount?: string

  @Expose()
  @IsOptional()
  @IsBoolean()
  isSuccessful?: boolean
}

export class BidHistoryFailedReason {
  @IsString()
  userErrorMessage: string

  @IsString()
  internalErrorMessage: string
}

export class NewBidHistoryDto extends CreateNftHistoryDto {
  @Prop({ type: MUUID })
  @Transform(({ value }) => MUUID.from(value).toString())
  bidId: MUUID.MUUID

  @Prop({ type: Currency })
  currency: Currency

  @IsString()
  amount: string

  @Prop({ type: PaymentStatus })
  paymentStatus: PaymentStatus

  @Prop({ type: BidHistoryFailedReason, required: false })
  failedReason?: BidHistoryFailedReason
}
