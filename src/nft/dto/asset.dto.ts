import { IsEnum, IsString, ValidateNested } from 'class-validator'
import { AssetType } from '../schemas/nft.schema'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class AssetDto {
  @IsString()
  @ApiProperty()
  url: string

  @IsString()
  @ApiProperty()
  key: string

  @IsEnum(AssetType)
  @ApiProperty()
  type: AssetType
}

export class ImagesSetDto {
  @ValidateNested()
  @ApiProperty()
  @Type(() => AssetDto)
  small: AssetDto

  @ValidateNested()
  @ApiProperty()
  @Type(() => AssetDto)
  large: AssetDto

  @ValidateNested()
  @ApiProperty()
  @Type(() => AssetDto)
  original: AssetDto
}
