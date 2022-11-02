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
import { AuctionType, NftStatus, PaymentProviders } from '../../shared/enum'
import { Nft } from '../../nft/schemas/nft.schema'
import { Owner } from '../../shared/sub-schemas/owner.schema'

export class CreateEditionDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  name: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesSetDto)
  image?: ImagesSetDto

  @Type(() => Owner)
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

export class NftOwner {
  @IsString()
  id: string

  @IsString()
  avnPubKey?: string

  @IsString()
  username?: string
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
  id: string

  @Expose()
  @IsString()
  name: string

  @Expose()
  @IsNumber()
  quantity: number

  @Expose()
  @IsNumber()
  availableCount: number

  @Expose()
  @IsNumber()
  ownedCount: number

  @Expose()
  @IsNumber()
  listingIndex: number

  @Expose()
  status: NftStatus

  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  owner: Owner

  @Expose()
  nfts?: string[]

  @Expose()
  nft?: Nft | null

  @Expose()
  listingType?: AuctionType.fixedPrice | AuctionType.freeClaim

  @Expose()
  @IsBoolean()
  canBeHidden?: boolean

  @Expose()
  listingOptions?: ListingOptions

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesSetDto)
  image?: ImagesSetDto

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => AssetDto)
  assets?: AssetDto[]

  @Expose()
  @IsBoolean()
  isHidden?: boolean

  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  minterId?: string

  @Expose()
  @ValidateNested()
  @Type(() => CreateUnlockableContentDto)
  unlockableContent?: CreateUnlockableContentDto
}
