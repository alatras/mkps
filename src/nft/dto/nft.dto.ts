import { PartialType } from '@nestjs/mapped-types'
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
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
import { getRequiredNftProperties } from '../../utils/nftProperties/getRequiredNftProperties'
import { validateDynamicNftProperties } from '../../utils/nftProperties/validateNftProperties'

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
  @ApiProperty()
  @IsOptional()
  claimedCount: number
}

export class CreateNftDto {
  @Expose()
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'name cannot be empty.' })
  name: string

  @ApiProperty()
  @IsString()
  @MaxLength(1000, { message: 'description must be maximum 1000 characters.' })
  @MinLength(1, { message: 'description cannot be empty.' })
  description: string

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
  @Validate(values => validateDynamicNftProperties(values), {
    message: `Nft Properties must include all of the following: ${getRequiredNftProperties().join(
      ', '
    )}.`
  })
  properties: Record<string, unknown>

  @ApiProperty()
  @Type(() => Owner)
  @ValidateNested({ each: true })
  owner?: Owner

  @ApiProperty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(80)
  @IsOptional()
  royalties?: number

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

  @Expose()
  @ApiProperty()
  @IsString()
  id: string
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

  @Expose()
  @ApiProperty()
  @IsString()
  name: string

  @Expose()
  @ApiProperty()
  @IsString()
  description: string

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
  properties: Record<string, unknown>

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
