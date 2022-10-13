import { Document } from 'mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose'
import { AuctionType, Currency, DbCollections } from '../../shared/enum'
import { HistoryType } from '../../shared/enum/historyType'

export type NftHistoryDocument = NftHistory & Document

@Schema({
  collection: DbCollections.NftHistory,
  versionKey: false
})
export class NftHistory {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  nftId: object

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4(),
    required: true
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

  @Prop({ required: true })
  transactionHash: string

  @Prop({ type: String, enum: HistoryType })
  currency?: Currency

  @Prop({ type: String, required: true, enum: HistoryType })
  type?: HistoryType

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const NftHistorySchema = SchemaFactory.createForClass(NftHistory)
