import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AuctionStatus, AuctionType, Currency, DbCollections } from '../../shared/enum'

class Edition {
  _id: object
  avnId?: string
}

class AuctionSellerBase {
  _id: object
  avnPubKey: string | null;
}

class AuctionWinner extends AuctionSellerBase { }

class EthAuctionSeller extends AuctionSellerBase {
  ethAddress?: string
}

class EthereumTransaction {
  userId: object
  transactionHash: string
  value: string
  createdAt: Date
}

export type EditionListingDocument = EditionListing & Document

@Schema({
  collection: DbCollections.EditionListings,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class EditionListing {
  @Prop()
  edition: Edition

  @Prop()
  seller: EthAuctionSeller

  @Prop()
  currency: Currency

  @Prop()
  status: AuctionStatus

  @Prop()
  reservePrice: string

  @Prop()
  pendingEthereumTransactions?: EthereumTransaction[]

  @Prop()
  pendingBuyers?: object[]

  // @Prop()
  // highestBidId?: object

  @Prop()
  winner: AuctionWinner | null

  @Prop()
  type: AuctionType.fixedPrice | AuctionType.airdrop | AuctionType.freeClaim

  @Prop()
  endTime: Date

  @Prop()
  requestId: string

  @Prop()
  quantity: number

  @Prop()
  updatedAt: Date
}

export const EditionListingSchema = SchemaFactory.createForClass(EditionListing)
