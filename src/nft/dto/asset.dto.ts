import { IsEnum, IsString, ValidateNested } from 'class-validator'
import { AssetType } from '../schemas/nft.schema'
import { Type } from 'class-transformer'

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
