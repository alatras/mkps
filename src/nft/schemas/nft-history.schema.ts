import { Document } from 'mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose'
import { AuctionType, Currency, DbCollections } from '../../shared/enum'
import { HistoryType } from '../../shared/enum/historyType'
import { Nft } from './nft.schema'
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
    value: { type: 'Buffer' },
    transform: val => uuidFrom(val)
  })
  nftId: string

  @Transform(({ value }) => uuidFrom(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    required: false
  })
  auctionId?: object

  @Prop({ required: true })
  userAddress: string

  @Prop()
  fromAddress?: string

  @Prop({ type: String, enum: HistoryType })
  saleType?: AuctionType

  @Prop()
  amount?: string

  @Prop()
  toAddress?: string

  @Prop()
  transactionHash?: string

  @Prop({ type: String, enum: HistoryType })
  currency?: Currency

  @Prop({ type: String, required: true, enum: HistoryType })
  type: HistoryType

  constructor(partial: Partial<NftHistory>) {
    Object.assign(this, partial)
  }
}

export const NftHistorySchema = SchemaFactory.createForClass(NftHistory)
