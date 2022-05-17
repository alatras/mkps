import { Document } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { User } from '../../user/schemas/user.schema'

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

@Schema({ _id: false, typeKey: '$type' })
export class Asset {
  @Prop()
  url: string

  @Prop()
  key: string

  @Prop({
    type: String,
    enum: Object.keys(AssetType),
    required: true,
  })
  type: AssetType
}

@Schema({ _id: false })
export class UnlockableContent {
  @Prop({ required: true })
  preview: string

  @Prop({ required: true })
  quantity: number

  @Prop({ required: true })
  claimedCount: number

  @Prop()
  isClaimable: boolean

  @Prop()
  details: string
}

@Schema({ _id: false })
export class ImagesSet {
  @Prop({ type: Asset })
  small: Asset

  @Prop({ type: Asset })
  medium: Asset

  @Prop({ type: Asset })
  large: Asset

  @Prop({ type: Asset })
  original: Asset
}

export type NftDocument = Nft & Document

@Schema({ collection: 'nfts', versionKey: false })
export class Nft extends Document {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop({
    type: User,
    value: { type: 'Buffer' },
    default: () => MUUID.v4(),
    ref: User.name,
    required: true
  })
  @Type(() => User)
  minterId: User

  @Prop([Asset])
  assets: Asset[]

  @Prop()
  createdAt: Date

  @Prop()
  updatedAt: Date

  @Prop({ required: true })
  isHidden: boolean

  @Prop({ type: UnlockableContent })
  unlockableContent: UnlockableContent

  @Prop()
  avnAddress?: string

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
    default: () => MUUID.v4(),
    ref: User.name,
    required: true
  })
  @Type(() => User)
  owner: User

  @Prop({ type: 'object', required: true })
  properties: Record<string, any>

  @Prop({ type: [String], required: true })
  ethAddresses: string[]
}

export const NftSchema = SchemaFactory.createForClass(Nft)
