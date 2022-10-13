import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import { Document } from 'mongoose'
import {
  AuctionStatus,
  AuctionType,
  Currency,
  DbCollections
} from '../../shared/enum'
import * as MUUID from 'uuid-mongodb'

class Edition {
  _id: object
  avnId?: string
}

class AuctionSellerBase {
  _id: object
  avnPubKey: string | null
}

class AuctionWinner extends AuctionSellerBase {}

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
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

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
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const EditionListingSchema = SchemaFactory.createForClass(EditionListing)
