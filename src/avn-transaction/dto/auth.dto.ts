import { IsNotEmpty, IsString } from 'class-validator'

export class MintAvnTransactionDto {
  @IsString()
  @IsNotEmpty()
  nftId: string
}
