import { Prop } from '@nestjs/mongoose'
import {
  IsBoolean,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional
} from 'class-validator'
import { MUUID } from 'uuid-mongodb'
import {
  AvnTransactionState,
  AvnTransactionType,
  Market
} from '../../shared/enum'
import {
  AvnCancelFiatListingHistory,
  AvnTransactionHistoryBase
} from '../schemas/avn-transaction.schema'

export class MintAvnTransactionDto {
  @IsString()
  @IsNotEmpty()
  nftId: string
}

class AvnOpenForSaleTransactionData {
  @Prop({
    type: 'object',
    value: { type: 'Buffer' }
  })
  userId: MUUID

  // Fixed string Ethereum
  @IsEnum(Market)
  market: Market

  // ETH address signed by user in Metamask client. The only proof.
  @IsString()
  ethereumAddress: string

  // End date (Unix timestamp) (Should be validate server side)
  @IsNumber()
  endTime: number

  // if the listing type is an auction or fixed price
  @IsBoolean()
  isFixedPrice: boolean

  @IsString()
  @IsOptional()
  avnNftId?: string

  // NFT ID in local database
  @IsString()
  @IsOptional()
  nftId?: string
}

class AvnCancelFiatSaleTransactionData {
  @Prop({
    type: 'object',
    value: { type: 'Buffer' }
  })
  userId: MUUID

  // ETH address signed by user in Metamask client. The only proof.
  @IsString()
  ethereumAddress: string

  // NFT ID in local database
  @IsString()
  @IsOptional()
  nftId?: string

  @IsString()
  @IsOptional()
  avnNftId?: string
}

export class ListAvnTransactionDto {
  @IsString()
  request_id: string

  @IsString()
  nftId?: string

  @Prop({ type: AvnTransactionType })
  type: AvnTransactionType

  @Prop({ type: AvnOpenForSaleTransactionData })
  data: AvnOpenForSaleTransactionData

  @Prop({ type: AvnTransactionState })
  state: AvnTransactionState

  @Prop({ type: Array<AvnTransactionHistoryBase> })
  history: AvnTransactionHistoryBase[]
}

export class CancelListingAvnTransactionDto {
  @Prop()
  @IsString()
  request_id: string

  @IsString()
  nftId?: string

  @Prop()
  @IsString()
  auctionId: string

  @Prop({ type: AvnTransactionType })
  type: AvnTransactionType

  @Prop({ type: AvnOpenForSaleTransactionData })
  data: AvnCancelFiatSaleTransactionData

  @Prop({ type: AvnTransactionState })
  state: AvnTransactionState

  @Prop({ type: Array<AvnTransactionHistoryBase> })
  history: AvnCancelFiatListingHistory[]
}
