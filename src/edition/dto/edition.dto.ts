import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from 'class-validator'
import { Exclude, Expose, Transform, Type } from 'class-transformer'
import { User } from '../../user/schemas/user.schema'
import * as MUUID from 'uuid-mongodb'
import { AssetDto, ImagesSetDto } from '../../nft/dto/asset.dto'
import { CreateUnlockableContentDto } from '../../nft/dto/nft.dto'
import { PaymentProviders } from '../../shared/enum'
import { Owner } from '../../shared/sub-schemas/owner.schema'

export class NftOwner {
  @IsString()
  id: string

  @IsString()
  avnPubKey?: string

  @IsString()
  username?: string
}

export class CreateEditionDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  name: string

  @Expose()
  @Type(() => ImagesSetDto)
  @ValidateNested({ each: true })
  image: ImagesSetDto

  @Expose()
  @Type(() => Owner)
  @ValidateNested({ each: true })
  owner: Owner

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => AssetDto)
  assets?: AssetDto[]

  @IsBoolean()
  isHidden: boolean

  @Expose()
  @Transform(({ value }) => (value ? MUUID.from(value).toString() : ''))
  @IsString()
  minterId: User

  @ValidateNested()
  @Type(() => CreateUnlockableContentDto)
  unlockableContent?: CreateUnlockableContentDto

  @Expose()
  @IsNumber()
  @Max(1000, { message: 'Edition quantity above 1000' })
  @Min(1, { message: 'Edition quantity is invalid' })
  quantity?: number

  @Expose()
  @IsOptional()
  @IsString()
  sport?: string

  @Expose()
  @IsOptional()
  @IsString()
  collection?: string

  @Expose()
  @IsOptional()
  @IsString()
  athlete?: string

  @Expose()
  @IsOptional()
  @IsString()
  artist?: string

  @Expose()
  @IsOptional()
  @IsString()
  description?: string
}

export class ListingOptions {
  @Expose()
  @IsString()
  platformFees: string

  @Expose()
  @IsString()
  paymentProviders: PaymentProviders

  @Expose()
  @IsBoolean()
  isSecondarySale: boolean

  @Expose()
  @IsNumber()
  royalties: number
}

@Exclude()
export class EditionResponseDto {
  @Expose()
  @IsString()
  requestId: string
}
