import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { Exclude, Expose } from 'class-transformer'
import { DataWrapper } from '../../common/dataWrapper'

export class BuyNftDto {
  @Expose()
  @ApiProperty()
  @IsString()
  transactionHash: string

  @Expose()
  @ApiProperty()
  @IsString()
  redirectUrl: string

  @Expose()
  @ApiProperty()
  @IsString()
  nftId: string
}

export class BuyNftResponseDtoData {
  @Expose()
  @ApiProperty()
  hasPaymentMethod: boolean
}

@Exclude()
export class BuyNftResponseDto extends DataWrapper<BuyNftResponseDtoData> {}
