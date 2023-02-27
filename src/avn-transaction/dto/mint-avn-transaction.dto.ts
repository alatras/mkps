import { Prop } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsString
} from 'class-validator'
import { Nft } from 'src/nft/schemas/nft.schema'
import { from } from 'uuid-mongodb'
import {
  AvnTransactionState,
  AvnTransactionType,
  Market
} from 'src/shared/enum'
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
}

// class AvnOpenForSaleHistoryOperationData {
//   @IsString()
//   ethereumProof: string

//   @IsNumber()
//   opId: number

//   @IsString()
//   royalties: string

//   @IsString()
//   error?: string
// }

// class AvnOpenForSaleHistory {
//   @Prop({ type: AvnOpenForSaleHistoryOperationData })
//   operation_data: AvnOpenForSaleHistoryOperationData

//   @Prop({ type: AvnTransactionState })
//   state: AvnTransactionState

//   @IsNumber()
//   timestamp: number
// }

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
