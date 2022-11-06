import { PartialType } from '@nestjs/mapped-types'
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator'
import { Exclude, Expose, Transform, Type } from 'class-transformer'
import { Nft, UnlockableContent } from '../schemas/nft.schema'
import { User } from '../../user/schemas/user.schema'
import * as MUUID from 'uuid-mongodb'
import { AssetDto, ImagesSetDto } from './asset.dto'
import { Asset, ImagesSet } from '../schemas/asset.schema'
import { Document } from 'mongoose'
import { NftStatus } from '../../shared/enum'
import { Prop } from '@nestjs/mongoose'

export class CreateUnlockableContentDto {
  @Prop()
  @IsString()
  preview: string

  @Prop()
  @IsNumber()
  @Min(0, { message: 'negative unlockable content quantity' })
  quantity: number

  @Prop()
  @IsString()
  details: string

  @Prop({ default: 0 })
  @IsNumber()
  claimedCount: number
}

export class CreateNftDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  name?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesSetDto)
  image?: ImagesSetDto

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => AssetDto)
  assets?: AssetDto[]

  @ValidateNested()
  @Type(() => CreateUnlockableContentDto)
  unlockableContent?: CreateUnlockableContentDto

  @IsObject()
  properties: Record<string, any>

  constructor(partial: Partial<Nft>) {
    Object.assign(this, partial)
  }
}

@Exclude()
export class NftResponseDto {
  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  _id: string

  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  minterId: User

  @IsArray()
  @ValidateNested({ each: true })
  assets: Asset[]

  @Expose()
  @IsDate()
  createdAt: Date

  @IsBoolean()
  isHidden: boolean

  @Expose()
  @Type(() => UnlockableContent)
  unlockableContent: UnlockableContent

  @Expose()
  @IsString()
  avnAddress?: string

  @Expose()
  @IsString()
  year?: string

  @Expose()
  @Type(() => ImagesSet)
  image?: ImagesSet

  @Expose()
  @IsEnum(NftStatus)
  status: NftStatus

  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  owner: string

  @Expose()
  @IsObject()
  properties: Record<string, any>

  constructor(partial: Partial<Nft>) {
    if (partial instanceof Document) {
      partial = partial.toObject()
    }

    Object.assign(this, partial)
  }
}

export class UpdateNftDto extends PartialType(CreateNftDto) {}
