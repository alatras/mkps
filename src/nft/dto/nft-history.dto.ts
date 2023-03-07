import { HistoryType } from '../../shared/enum'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Expose } from 'class-transformer'

export class CreateNftHistoryDto {
  @Expose()
  @IsString()
  nftId: string

  @Expose()
  @IsOptional()
  @IsString()
  auctionId?: string

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
  type: HistoryType

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
}
