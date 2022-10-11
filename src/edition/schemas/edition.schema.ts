import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AuctionType, DbCollections } from '../../shared/enum'
import { Transform } from "class-transformer"
import * as MUUID from "uuid-mongodb"

export type NftEditionDocument = NftEdition & Document

@Schema({
  collection: DbCollections.Editions,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class NftEdition {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop()
  name: string

  @Prop()
  avnId?: string
  // For Ethereum, every time we start a new batch listing
  // we need to increment an index so the blockchain keeps track.
  @Prop()
  listingIndex: number

  @Prop()
  quantity: number

  @Prop()
  availableCount: number

  @Prop()
  ownedCount: number

  @Prop()
  isHidden: boolean

  // @Transform(({ value }) => MUUID.from(value).toString())
  @Prop()
  nfts: object[]

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date

  @Prop()
  listingType?: AuctionType.fixedPrice | AuctionType.freeClaim
}

export const NftEditionSchema = SchemaFactory.createForClass(NftEdition)
