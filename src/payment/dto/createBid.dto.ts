import { IsNotEmpty, IsString } from 'class-validator'
import { Currency } from '../../shared/enum'

export class CreateBidDto {
  @IsString()
  @IsNotEmpty()
  auctionId: string

  // Stripe payment doesn't provide transactionHash
  @IsString()
  transactionHash?: string

  @IsString()
  @IsNotEmpty()
  fromAddress?: string

  @IsString()
  @IsNotEmpty()
  value: string

  @IsString()
  @IsNotEmpty()
  currency: Currency
}
