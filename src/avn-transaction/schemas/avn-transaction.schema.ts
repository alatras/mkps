import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import {
  AvnTransactionState,
  AvnTransactionType,
  DbCollections
} from '../../shared/enum'
import * as MUUID from 'uuid-mongodb'

export class AvnTransactionHistory {}

export class AvnTransactionHistoryBase {
  // The state when that history is created
  state: AvnTransactionState
  // The timestamp when that history was created
  timestamp: number
}

export interface AvnMintTransaction extends AvnNftTransaction {
  data: AvnMintNftTransactionData
  history: AvnMintHistory[]
}

export class AvnMintHistory extends AvnTransactionHistoryBase {
  operation_data?: AvnMintHistoryOperationData
}

export class AvnCancelFiatListingHistory extends AvnTransactionHistoryBase {
  operation_data?: AvnMintHistoryOperationData
}

export class AvnMintNftTransactionData {
  // uniqueExternalRef used to access the real NFT stored offchain
  unique_external_ref: string
  // Aventus public key of the minter
  userId: MUUID.MUUID
  // Royalties details for the NFT we are minting
  royalties: Royalties[]
}

export class AvnMintHistoryOperationData {
  // Nft id from the AvN blockchain
  nftId: string
  // Minter address from the AvN blockchain (this is base58 encoded format of the public key)
  ownerAvnAddress: string

  error?: string
}

export interface RoyaltyRate {
  parts_per_million: number
}

export interface Royalties {
  recipient_t1_address: string
  rate: RoyaltyRate
}

export class AvnCreateBatchTransactionData {
  // total Supply (quantity) of the batch
  totalSupply: number
  // Aventus public key of the minter
  userId: MUUID.MUUID
  // Royalties details for the NFT we are minting
  royalties: Royalties[]
}

export class AvnMintBatchHistoryOperationData {
  // Edition id from the AvN blockchain
  batchId: string
  // Minter address from the AvN blockchain (this is base58 encoded format of the public key)
  ownerAvnAddress: string

  error?: string
}

export class AvnMintBatchHistory extends AvnTransactionHistoryBase {
  operation_data?: AvnMintBatchHistoryOperationData
}

export type AvnNftTransactionDocument = AvnNftTransaction & Document
export type AvnEditionTransactionDocument = AvnEditionTransaction & Document

export class AvnTransactionBase {
  @Prop()
  request_id: string

  @Prop()
  nftId?: string

  @Prop()
  type: AvnTransactionType

  @Prop()
  state: AvnTransactionState

  @Prop()
  history?: AvnTransactionHistoryBase[]
}

@Schema({
  collection: DbCollections.AvnTransactions,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class AvnEditionTransaction extends AvnTransactionBase {
  @Prop()
  history: AvnMintBatchHistory[]

  @Prop()
  data: AvnCreateBatchTransactionData
}

export const AvnEditionTransactionSchema = SchemaFactory.createForClass(
  AvnEditionTransaction
)

export class AvnCreateBatchTransaction extends AvnTransactionBase {
  data: AvnCreateBatchTransactionData
  history: AvnMintBatchHistory[]
}

@Schema({
  collection: DbCollections.AvnTransactions,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class AvnNftTransaction extends AvnTransactionBase {
  @Prop()
  history: AvnMintHistory[]

  @Prop()
  data: AvnMintNftTransactionData
}

export const AvnNftTransactionSchema =
  SchemaFactory.createForClass(AvnNftTransaction)

export class AvnMintBatchTransactionData {
  // uniqueExternalRef used to access the real NFT stored offchain
  unique_external_ref: string
  // Aventus public key of the minter
  userId: MUUID.MUUID
  // batch_id on the Aventus chain
  batch_id: string
  // Avn Address of the buyer on the Aventus transaction
  buyer_avn_address: string
  // starting index for the batch
  index: number
  // Total Supply for the batch
  totalSupply: number
}

export class AvnMintBatchTransaction extends AvnTransactionBase {
  data: AvnMintBatchTransactionData
  history: AvnMintBatchHistory[]
}

export class AvnProcessFiatSaleTransactionData {
  // avn pub key for new owner
  new_owner: string
  saleValue: string
  nft_id: string
  userId: MUUID.MUUID
}

export class AvnProcessFiatSaleTransaction extends AvnTransactionBase {
  data: AvnProcessFiatSaleTransactionData
}
