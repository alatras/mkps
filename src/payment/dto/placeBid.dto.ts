import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class PlaceBidDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number

  @IsString()
  @IsNotEmpty()
  nftId: string
}
