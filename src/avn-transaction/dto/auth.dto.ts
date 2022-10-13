import { IsNotEmpty, IsString } from 'class-validator'

export class MintAvnTransactionDto {
  @IsString()
  @IsNotEmpty()
  requestId: string

  @IsString()
  @IsNotEmpty()
  nftId: string
}
