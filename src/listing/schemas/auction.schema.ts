import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import {
  AuctionStatus,
  AuctionType,
  Currency,
  DbCollections
} from '../../shared/enum'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Owner } from '../../shared/sub-schemas/owner.schema'
import { IsDate, IsString } from 'class-validator'

export type AuctionDocument = Auction & Document

class AuctionNft {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({ type: 'object', required: true })
  _id: object

  @Prop()
  eid: string

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({ type: 'object', required: false })
  editionId?: object
}

class AuctionUser {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({ type: 'object', required: false })
  _id: object

  @Prop({ required: false })
  avnPubKey: string
}

class AuctionSeller extends AuctionUser {
  @Prop({ required: false })
  ethAddress?: string
}

class StripePayment {
  @Prop()
  paymentMethodId: string

  @Prop()
  paymentIntentId: string

  @Prop()
  captured: boolean

  @Prop({ required: false })
  failed: boolean

  @Prop({ required: false })
  canceled: boolean
}

class LeaderboardPoints {
  @Prop({ required: false })
  sale: number

  @Prop({ required: false })
  purchase: number

  @Prop({ required: false })
  claim: number

  @Prop({ required: false })
  unlockableContent: number
}

class Sale {
  @Prop({ required: true })
  value: string

  @Prop({ type: Owner, required: false })
  owner?: Owner

  @IsDate()
  @Prop({ required: false })
  soldAt?: Date

  @Prop({ type: StripePayment, required: false })
  stripe?: StripePayment

  @Prop({ required: false })
  @IsString()
  transactionHash?: string
}

@Schema({
  collection: DbCollections.Auctions,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class Auction {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop({ type: AuctionNft })
  nft: AuctionNft

  @Prop({ default: false })
  isSecondary: boolean

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({ type: 'object', required: false })
  editionListingId?: object

  @Prop({ required: true })
  seller: AuctionSeller

  @Prop({
    type: String,
    enum: Object.values(Currency),
    required: true
  })
  currency: Currency

  @Prop({
    type: String,
    enum: Object.values(AuctionStatus),
    required: true
  })
  status: AuctionStatus

  @Prop({ required: true })
  reservePrice: string

  @Prop({ required: true })
  endTime: Date

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({ type: 'object', required: false })
  highestBidId: object

  @Prop({ required: false })
  winner: AuctionUser

  @Prop({ required: true })
  type: AuctionType

  @Prop({ type: Sale, required: false })
  sale?: Sale

  @Prop({ required: false })
  unlockableContentClaimedAt?: Date

  @Prop({ required: false })
  leaderboardPoints?: LeaderboardPoints
}

export const AuctionSchema = SchemaFactory.createForClass(Auction)
