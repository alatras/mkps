import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AvnTransactionState, AvnTransactionType, DbCollections } from '../../shared/enum'
import { Transform } from "class-transformer"
import * as MUUID from "uuid-mongodb"

export interface AvnTransactionBase {
  request_id: string;
  type: AvnTransactionType;
  state: AvnTransactionState;
  history: AvnTransactionHistoryBase[];
}

export interface AvnTransactionHistoryBase {
  // The state when that history is created
  state: AvnTransactionState;
  // The timestamp when that history was created
  timestamp: number;
}


export interface AvnMintTransaction extends AvnTransactionBase {
  data: AvnMintTransactionData;
  history: AvnMintHistory[];
}

export interface AvnMintHistory extends AvnTransactionHistoryBase {
  operation_data: AvnMintHistoryOperationData;
}

export class AvnMintTransactionData {
  // uniqueExternalRef used to access the real NFT stored offchain
  unique_external_ref: string;
  // Aventus public key of the minter
  userId: MUUID.MUUID;
  // Royalties details for the NFT we are minting
  royalties: Royalties[];
}

export interface AvnMintHistoryOperationData {
  // Nft id from the AvN blockchain
  nftId: string;
  // Minter address from the AvN blockchain (this is base58 encoded format of the public key)
  ownerAvnAddress: string;

  error?: string;
}

export interface RoyaltyRate {
  parts_per_million: number;
}

export interface Royalties {
  recipient_t1_address: string;
  rate: RoyaltyRate;
}

export type AvnTransactionDocument = AvnTransaction & Document

@Schema({
  collection: DbCollections.AvnTransactions,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class AvnTransaction {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop({ required: true })
  request_id: string

  @Prop()
  type: AvnTransactionType

  @Prop()
  data: AvnMintTransactionData

  @Prop()
  state: AvnTransactionState

  @Prop()
  history: AvnMintHistory[]

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const AvnTransactionSchema = SchemaFactory.createForClass(AvnTransaction)
