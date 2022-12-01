import { IsNotEmpty, IsString } from 'class-validator'

export class PresignedUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  contentType: string

  @IsString()
  @IsNotEmpty()
  nftId: string
}
