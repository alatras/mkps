import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { AvnTransactionState, AvnTransactionType, DbCollections, Market } from '../../shared/enum'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { Nft } from '../../nft/schemas/nft.schema'

export interface AvnTransactionBase {
  request_id: string;
  type: AvnTransactionType;
  state: AvnTransactionState;
  history: AvnTransactionHistoryBase[];
}

export interface AvnTransactionDataBase {
  // Nft id from Ethereum
  nft_id: Nft['eid'];
  // Aventus public key of the user
  // !!! the above comment is probably wrong, it seems to be the MUUID of the user instead
  userId: MUUID;
}

export interface AvnTransactionEditionDataBase {
  // Nft id from Ethereum
  batch_id: NftEdition['avnId'];
  // Aventus public key of the user
  // !!! the above comment is probably wrong, it seems to be the MUUID of the user instead
  userId: MUUID;
}

export interface AvnTransactionHistoryBase {
  // The state when that history is created
  state: AvnTransactionState;
  // The timestamp when that history was created
  timestamp: number;
}

export interface AvnMintToTransactionData {
  // Ethereum transaction hash where auction was closed
  eth_transaction_hash: string;
  // UUID of the Minted NFT
  uuid: string;
  // avnPublicKey of the new owner
  avnPublicKey: string;
}

export interface AvnCancelFiatAuctionTransaction extends AvnTransactionBase {
  data: AvnCancelFiatAuctionTransactionData;
}

export type AvnCancelFiatAuctionTransactionData = AvnTransactionDataBase;

export interface AvnEndFiatBatchSaleTransaction extends AvnTransactionBase {
  data: AvnEndFiatBatchSaleTransactionData;
}

export type AvnEndFiatBatchSaleTransactionData = AvnTransactionEditionDataBase;

export interface AvnCancelEthAuctionTransaction extends AvnTransactionBase {
  data: AvnCancelEthAuctionTransactionData;
}

export interface AvnCancelEthAuctionTransactionData
  extends AvnTransactionDataBase {
  // Nft id from the AvN blockchain
  nftId: string;
  // Unique operation Id for this auction
  avnOpId: string;
  // Ethereum transaction hash where auction was closed
  eth_transaction_hash: string;
}

export interface AvnBatchListingTransaction extends AvnTransactionBase {
  data: AvnBatchListingTransactionData;
}

export interface AvnBatchListingTransactionData extends AvnTransactionDataBase {
  // Nft id from the AvN blockchain
  batchId: string;
  // Unique operation Id for this auction
  avnOpId: string;
  // Ethereum transaction hash where auction was closed
  eth_transaction_hash: string;
}

export interface AvnProcessFiatSaleTransaction extends AvnTransactionBase {
  data: AvnProcessFiatSaleTransactionData;
}

export interface AvnProcessFiatSaleTransactionData
  extends AvnTransactionDataBase {
  // avn pub key for new owner
  new_owner: string;
  saleValue: string;
}

export interface AvnTransferToTransaction extends AvnTransactionBase {
  data: AvnTransferToTransactionData;
}

export interface AvnOpenForSaleTransaction extends AvnTransactionBase {
  data: AvnOpenForSaleTransactionData;
  history: AvnOpenForSaleHistory[];
}

export interface AvnOpenForSaleHistory extends AvnTransactionHistoryBase {
  operation_data: AvnOpenForSaleHistoryOperationData;
}

export interface AvnOpenForSaleTransactionData extends AvnTransactionDataBase {
  // Fixed string Ethereum
  market: Market;
  // ETH Address of the Seller (only that address can use the proof)
  ethereumAddress: string;
  // End date (Unix timestamp) (Should be validate server side)
  endTime: number;
  // if the listing type is an auction or fixed price
  isFixedPrice: boolean;
}

export interface AvnOpenForSaleHistoryOperationData {
  ethereumProof: string;
  opId: number;
  royalties: string;
  error?: string;
  // etc...
  // sender_system_nonce
  // extrinsic_data
  // encoded_data
}

export interface AvnListBatchTransaction extends AvnTransactionBase {
  data: AvnListBatchTransactionData;
  history: AvnListBatchHistory[];
}

export interface AvnListBatchHistory extends AvnTransactionHistoryBase {
  operation_data: AvnListBatchHistoryOperationData;
}

export interface AvnListBatchTransactionData
  extends AvnTransactionEditionDataBase {
  // Fixed string Ethereum
  market: Market;
  // ETH Address of the Seller (only that address can use the proof)
  ethereumAddress: string;
  // Quantity from the edition
  totalSupply: number;
  // Quantity minus the NFTs already sold
  saleIndex: number;
  // an incremented integer everytime start a listing
  listingNumber: number;
}

export interface AvnListBatchHistoryOperationData {
  ethereumProof: string;
  opId: number;
  royalties: string;
  error?: string;
}

export interface AvnMintTransaction extends AvnTransactionBase {
  data: AvnMintTransactionData;
  history: AvnMintHistory[];
}

export interface AvnMintBatchTransaction extends AvnTransactionBase {
  data: AvnMintBatchTransactionData;
  history: AvnMintBatchHistory[];
}

export interface AvnCreateBatchTransaction extends AvnTransactionBase {
  data: AvnCreateBatchTransactionData;
  history: AvnMintBatchHistory[];
}

export interface AvnMintToTransaction extends AvnTransactionBase {
  data: AvnMintToTransactionData;
  history: AvnMintToHistory[];
}

export interface AvnMintHistory extends AvnTransactionHistoryBase {
  operation_data: AvnMintHistoryOperationData;
}

export interface AvnMintBatchHistory extends AvnTransactionHistoryBase {
  operation_data: AvnMintBatchHistoryOperationData;
}

export interface AvnMintToHistory extends AvnTransactionHistoryBase {
  operation_data: AvnMintToHistoryOperationData;
}

export class AvnMintTransactionData {
  // uniqueExternalRef used to access the real NFT stored offchain
  unique_external_ref: string;
  // Aventus public key of the minter
  userId: MUUID;
  // Royalties details for the NFT we are minting
  royalties: Royalties[];
}

export interface AvnMintBatchTransactionData {
  // uniqueExternalRef used to access the real NFT stored offchain
  unique_external_ref: string;
  // Aventus public key of the minter
  userId: MUUID;
  // batch_id on the Aventus
  batch_id: string;
  // Avn Address of the buyer on the Aventus
  buyer_avn_address: string;
  // starting index for the batch
  index: number;
  // Total Supply for the batch
  totalSupply: number;
}

export interface AvnCreateBatchTransactionData {
  // total Supply (quantity) of the batch
  totalSupply: number;
  // Aventus public key of the minter
  userId: MUUID;
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

export interface AvnMintBatchHistoryOperationData {
  // Edition id from the AvN blockchain
  batchId: string;
  // Minter address from the AvN blockchain (this is base58 encoded format of the public key)
  ownerAvnAddress: string;

  error?: string;
}

export interface AvnMintToHistoryOperationData {
  // Nft id from the AvN blockchain
  nftId: string;
  // Batch id from the AvN blockchain
  batchId: string;
  // Minter address from the AvN blockchain (this is base58 encoded format of the public key)
  ownerAvnAddress: string;

  error?: string;
}

export interface AvnTransferToTransactionData {
  // Nft id from the AvN blockchain
  nftId: string;
  // Avn public key of the new owner
  avnPublicKey: string;
  // Ethereum transaction hash where auction was closed
  eth_transaction_hash: string;
  // Unique operation Id for this auction
  avnOpId: number;
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
}

export const AvnTransactionSchema = SchemaFactory.createForClass(AvnTransaction)
