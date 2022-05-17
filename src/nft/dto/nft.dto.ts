import { PartialType } from '@nestjs/mapped-types'
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested
} from 'class-validator'
import { Type } from 'class-transformer'
import { Asset, ImagesSet } from '../schemas/nft.schema'
import { User } from '../../user/schemas/user.schema'

export class CreateUnlockableContentDto {
  @IsString()
  preview: string

  @IsNumber()
  quantity: number

  @IsString()
  details: string
}

export class CreateNftDto {
  id?: string
  name: string

  @IsOptional()
  @Type(() => ImagesSet)
  image?: ImagesSet

  @Type(() => User)
  @IsUUID()
  owner?: string

  @IsDate()
  createdAt?: Date

  @IsDate()
  updatedAt?: Date

  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => Asset)
  assets?: Asset

  @IsBoolean()
  isHidden?: boolean

  @IsUUID()
  minterId?: string

  @IsObject()
  unlockableContent?: CreateUnlockableContentDto
}

export class NftResponseDto {}

export class UpdateNftDto extends PartialType(CreateNftDto) {}
