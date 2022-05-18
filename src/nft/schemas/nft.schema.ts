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
  @Prop({ $type: String, required: true })
  url: string

  @Prop({ $type: String, required: true })
  key: string

  @Prop({
    $type: String,
    enum: AssetType,
    required: true,
    default: AssetType.image
  })
  type: AssetType
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
  isClaimable: boolean

  @Prop()
  details: string
}

@Schema({ _id: false })
export class ImagesSet {
  @Prop({ type: Asset })
  @Type(() => Asset)
  small: Asset

  @Prop({ type: Asset })
  @Type(() => Asset)
  medium: Asset

  @Prop({ type: Asset })
  @Type(() => Asset)
  large: Asset

  @Prop({ type: Asset })
  @Type(() => Asset)
  original: Asset
}

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
    type: 'object',
    value: { type: 'Buffer' },
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
