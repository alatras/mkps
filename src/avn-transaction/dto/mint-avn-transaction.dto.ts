import { Prop } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional
} from 'class-validator'
import { Nft } from '../../nft/schemas/nft.schema'
import { from } from 'uuid-mongodb'
import {
  AvnTransactionState,
  AvnTransactionType,
  Market
} from '../../shared/enum'
import { AvnTransactionHistoryBase } from '../schemas/avn-transaction.schema'

export class MintAvnTransactionDto {
  @IsString()
  @IsNotEmpty()
  nftId: string
}

class AvnOpenForSaleTransactionData {
  // Nft id from Ethereum
  @IsString()
  nft_id: Nft['eid']

  @Prop({ type: 'object', required: true })
  @Transform(({ value }) => from(value).toString())
  userId: object

  // Fixed string Ethereum
  @IsEnum(Market)
  market: Market

  // ETH Address of the Seller (only that address can use the proof)
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

export class ListAvnTransactionDto {
  @IsString()
  request_id: string

  @Prop({ type: AvnTransactionType })
  type: AvnTransactionType

  @Prop({ type: AvnOpenForSaleTransactionData })
  data: AvnOpenForSaleTransactionData

  @Prop({ type: AvnTransactionState })
  state: AvnTransactionState

  @Prop({ type: Array<AvnTransactionHistoryBase> })
  history: AvnTransactionHistoryBase[]
}
