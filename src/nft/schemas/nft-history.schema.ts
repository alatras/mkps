import { Document } from 'mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Prop, SchemaFactory } from '@nestjs/mongoose'
import { AuctionType, Currency } from '../../shared/enums'

export enum HistoryType {
  minted = 'minted',
  listed = 'listed',
  bid = 'bid',
  purchased = 'purchased',
  cancelled = 'cancelled',
  transferred = 'transferred',
  unlockableContentClaimed = 'unlockableContentClaimed'
}

export class NftHistory extends Document {
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
  fromAddress: string

  @Prop({ type: String, enum: HistoryType })
  saleType: AuctionType

  @Prop()
  amount: string

  @Prop()
  toAddress: string

  @Prop({ required: true })
  createdAt: Date

  @Prop({ required: true })
  updatedAt: Date

  @Prop({ required: true })
  transactionHash?: string

  @Prop({ type: String, enum: HistoryType })
  currency: Currency

  @Prop({ type: String, required: true, enum: HistoryType })
  type: HistoryType
}

export const NftHistorySchema = SchemaFactory.createForClass(NftHistory)
