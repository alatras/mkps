import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString } from 'class-validator'

export class PresignedUrlQueryDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  fileName: string

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  contentType: string
}
