import { Document } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { User } from '../../user/schemas/user.schema'
import { Asset, ImagesSet } from './asset.schema'
import { DbCollections, NftStatus } from '../../shared/enum'
import { Owner } from '../../shared/sub-schemas/owner.schema'

export enum AssetType {
  image = 'image',
  video = 'video'
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
  versionKey: false
})
export class Nft {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: MUUID.MUUID

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

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  editionId?: MUUID.MUUID

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

  @Prop({ type: Owner })
  owner: Owner

  @Prop({ type: 'object' })
  properties?: Record<string, any>

  @Prop({ type: [String] })
  ethAddresses?: string[]

  @Prop()
  editionNumber?: number
}

export const NftSchema = SchemaFactory.createForClass(Nft)
