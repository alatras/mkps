import { Document } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import { MUUID, from, v4 } from 'uuid-mongodb'
import { User } from '../../user/schemas/user.schema'
import { Asset, ImagesSet } from './asset.schema'
import { Currency, DbCollections, NftStatus } from '../../shared/enum'
import { Owner } from '../../shared/sub-schemas/owner.schema'
import { ApiProperty } from '@nestjs/swagger'

export enum AssetType {
  image = 'image',
  video = 'video'
}

@Schema({ _id: false })
export class UnlockableContent {
  @Prop({ required: true })
  @ApiProperty()
  preview: string

  @Prop({ required: true })
  @ApiProperty()
  quantity: number

  @Prop({ required: true, default: 0 })
  @ApiProperty()
  claimedCount: number

  @Prop()
  @ApiProperty()
  isClaimable?: boolean

  @Prop()
  @ApiProperty()
  details: string
}

export type NftDocument = Nft & Document

@Schema({
  collection: DbCollections.NFTs,
  versionKey: false,
  timestamps: true
})
export class Nft {
  @Transform(({ value }) => from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => v4()
  })
  _id: MUUID

  @Prop()
  name: string

  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    ref: User.name
  })
  @Transform(({ value }) => from(value).toString())
  minterId: MUUID

  @Prop([Asset])
  assets: Asset[]

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date

  @Prop({ required: true })
  isHidden: boolean

  @Prop({ type: UnlockableContent })
  unlockableContent?: UnlockableContent

  @Prop()
  isMinted?: boolean

  @Prop()
  avnAddress?: string

  @Transform(({ value }) => from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' }
  })
  editionId?: MUUID

  @Prop()
  eid?: string

  @Prop()
  year?: string

  @Prop({ type: ImagesSet })
  image: ImagesSet

  @Prop({
    type: String,
    required: true,
    enum: NftStatus
  })
  status: NftStatus

  @Prop({ type: Owner })
  owner: Owner

  @Prop({ type: 'object' })
  properties: Record<string, unknown>

  @Prop({ type: [String] })
  ethAddresses?: string[]

  @Prop()
  editionNumber?: number

  @Prop({
    type: String,
    enum: Object.values(Currency),
    required: false
  })
  primarySaleCurrency?: Currency

  @Prop({ required: false })
  avnNftId?: string
}

export const NftSchema = SchemaFactory.createForClass(Nft)
