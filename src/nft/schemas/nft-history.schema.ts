import { Document } from 'mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose'
import { AuctionType, DbCollections, Currency } from '../../shared/enum'
import { uuidFrom } from '../../utils'

export type NftHistoryDocument = NftHistory & Document

@Schema({
  collection: DbCollections.NftHistory,
  versionKey: false,
  timestamps: true
})
export class NftHistory {
  @Transform(({ value }) => uuidFrom(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Transform(({ value }) => uuidFrom(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' }
  })
  nftId: string

  @Transform(({ value }) => uuidFrom(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    required: false
  })
  auctionId?: object

  @Prop()
  userAddress: string

  @Prop()
  type: string

  @Prop()
  fromAddress?: string

  @Prop({
    type: String,
    enum: Object.values(AuctionType),
    required: false
  })
  saleType?: AuctionType

  @Prop()
  amount?: string

  @Prop()
  toAddress?: string

  @Prop()
  transactionHash?: string

  @Prop({
    type: String,
    enum: Object.values(Currency),
    required: false
  })
  currency?: Currency

  constructor(partial: Partial<NftHistory>) {
    Object.assign(this, partial)
  }
}

export const NftHistorySchema = SchemaFactory.createForClass(NftHistory)
