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
  ValidateNested
} from 'class-validator'
import { Exclude, Expose, Transform, Type } from 'class-transformer'
import {
  Asset,
  AssetType,
  ImagesSet,
  Nft,
  NftStatus,
  UnlockableContent
} from '../schemas/nft.schema'
import { User } from '../../user/schemas/user.schema'
import * as MUUID from 'uuid-mongodb'

export class AssetDto {
  @IsString()
  url: string

  @IsString()
  key: string

  @IsEnum(AssetType)
  type: AssetType
}

export class ImagesSetDto {
  @ValidateNested()
  @Type(() => AssetDto)
  small: AssetDto

  @ValidateNested()
  @Type(() => AssetDto)
  medium: AssetDto

  @ValidateNested()
  @Type(() => AssetDto)
  large: AssetDto

  @ValidateNested()
  @Type(() => AssetDto)
  original: AssetDto
}

export class CreateUnlockableContentDto {
  @IsString()
  preview: string

  @IsNumber()
  quantity: number

  @IsString()
  details: string
}

export class CreateNftDto {
  @IsString()
  @IsOptional()
  id: string

  @IsString()
  name: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesSetDto)
  image: ImagesSetDto

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
  @Type(() => Asset)
  @Expose()
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
    Object.assign(this, partial)
  }
}

export class UpdateNftDto extends PartialType(CreateNftDto) {}
