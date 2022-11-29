import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString } from 'class-validator'

export class PresignedUrlQueryDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  contentType: string

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  nftName: string
}
