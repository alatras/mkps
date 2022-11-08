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
import * as MUUID from 'uuid-mongodb'
import { AssetDto, ImagesSetDto } from './asset.dto'
import { Asset, ImagesSet } from '../schemas/asset.schema'
import { Document } from 'mongoose'
import { NftStatus } from '../../shared/enum'
import { Prop } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'

export class CreateUnlockableContentDto {
  @Prop()
  @IsString()
  @ApiProperty()
  preview: string

  @Prop()
  @IsNumber()
  @ApiProperty()
  @Min(0, { message: 'negative unlockable content quantity' })
  quantity: number

  @Prop()
  @IsString()
  @ApiProperty()
  details: string

  @Prop({ default: 0 })
  @IsNumber()
  @IsOptional()
  @ApiProperty()
  claimedCount: number
}

export class CreateNftDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  @ApiProperty()
  name: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesSetDto)
  @ApiProperty()
  image: ImagesSetDto

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => AssetDto)
  @ApiProperty({ type: [AssetDto] })
  assets?: AssetDto[]

  @ValidateNested()
  @Type(() => CreateUnlockableContentDto)
  @ApiProperty()
  unlockableContent?: CreateUnlockableContentDto

  @IsObject()
  @ApiProperty()
  properties: Record<string, any>

  constructor(partial: Partial<Nft>) {
    Object.assign(this, partial)
  }
}

@Exclude()
export class NftResponseDto {
  @Expose()
  @ApiProperty()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  _id: string

  @Expose()
  @ApiProperty()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  minterId: string

  @IsArray()
  @ValidateNested({ each: true })
  assets: Asset[]

  @Expose()
  @ApiProperty()
  @IsDate()
  createdAt: Date

  @IsBoolean()
  isHidden: boolean

  @Expose()
  @ApiProperty({ type: UnlockableContent })
  @Type(() => UnlockableContent)
  unlockableContent: UnlockableContent

  @Expose()
  @ApiProperty()
  @IsString()
  avnAddress?: string

  @Expose()
  @ApiProperty()
  @IsString()
  year?: string

  @Expose()
  @ApiProperty()
  @Type(() => ImagesSet)
  image?: ImagesSet

  @Expose()
  @ApiProperty()
  @IsEnum(NftStatus)
  status: NftStatus

  @Expose()
  @ApiProperty()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  owner: string

  @Expose()
  @ApiProperty()
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
