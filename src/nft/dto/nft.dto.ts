import { PartialType } from '@nestjs/mapped-types'
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
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
import { Owner } from '../../shared/sub-schemas/owner.schema'

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
  @IsOptional()
  claimedCount: number
}

export class CreateNftDto {
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
  assets: AssetDto[]

  @ValidateNested()
  @Type(() => CreateUnlockableContentDto)
  @ApiProperty()
  unlockableContent?: CreateUnlockableContentDto

  @IsObject()
  @ApiProperty()
  properties: Record<string, any>

  @ApiProperty()
  @Type(() => Owner)
  @ValidateNested({ each: true })
  owner?: Owner

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  royalties?: number

  @ApiProperty()
  @IsString()
  @IsOptional()
  sport?: string

  @ApiProperty()
  @IsString()
  @IsOptional()
  collection?: string

  @ApiProperty()
  @IsString()
  @IsOptional()
  athlete?: string

  @ApiProperty()
  @IsString()
  @IsOptional()
  artist?: string

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string

  constructor(partial: Partial<Nft>) {
    Object.assign(this, partial)
  }
}

@Exclude()
export class CreateNftResponseDto {
  @Expose()
  @ApiProperty()
  @IsString()
  requestId: string
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

  @Expose()
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  royalties?: number

  constructor(partial: Partial<Nft>) {
    if (partial instanceof Document) {
      partial = partial.toObject()
    }

    Object.assign(this, partial)
  }
}

export class UpdateNftDto extends PartialType(CreateNftDto) {}
