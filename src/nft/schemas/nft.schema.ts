import { Document } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { User } from '../../user/schemas/user.schema'
import { Asset, ImagesSet } from './asset.schema'
import { DbCollections } from '../../shared/enum'

export enum AssetType {
  image = 'image',
  video = 'video'
}

export enum NftStatus {
  draft = 'Draft',
  minting = 'Minting',
  minted = 'Minted',
  saleOpening = 'Sale opening',
  forSale = 'For sale',
  saleClosing = 'Sale closing',
  owned = 'Owned'
}

@Schema({ _id: false })
export class UnlockableContent {
  @Prop({ required: true })
  preview: string

  @Prop({ required: true })
  quantity: number

  @Prop({ required: true, default: 0 })
  claimedCount: number

  @Prop()
  isClaimable?: boolean

  @Prop()
  details: string
}

export type NftDocument = Nft & Document

@Schema({
  collection: DbCollections.NFTs,
  versionKey: false,
})
export class Nft {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    ref: User.name,
    required: true
  })
  @Transform(({ value }) => MUUID.from(value).toString())
  @Type(() => User)
  minterId: object

  @Prop([Asset])
  assets: Asset[]

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date

  @Prop({ required: true })
  isHidden: boolean

  @Prop({ type: UnlockableContent })
  unlockableContent: UnlockableContent

  @Prop()
  isMinted?: boolean

  @Prop()
  avnAddress?: string

  @Prop()
  editionId?: string

  @Prop()
  eid?: string

  @Prop()
  year?: string

  @Prop({ type: ImagesSet })
  image?: ImagesSet

  @Prop({
    type: String,
    required: true,
    enum: NftStatus
  })
  status: NftStatus

  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    ref: User.name,
    required: true
  })
  @Transform(({ value }) => MUUID.from(value).toString())
  @Type(() => User)
  owner: object

  @Prop({ type: 'object', required: true })
  properties: Record<string, any>

  @Prop({ type: [String], required: true })
  ethAddresses: string[]
}

export const NftSchema = SchemaFactory.createForClass(Nft)
