import { Exclude, Expose, Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PresignedUrlUploadType } from 'src/shared/enum'
import { toNumber } from 'utils/toNumber';

export class PresignedUrlQueryDto {
  // @IsString()
  // public uploadType: PresignedUrlUploadType

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  public fileName: string

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  public contentType: string

  // @Transform(({ value }) => value.trim())
  // @IsString()
  // @IsOptional()
  // public bucketName?: string

  // @Transform(({ value }) => toNumber(value, 1000000)) // 1 MB
  // @IsString()
  // @IsOptional()
  // public maxBytes?: number
}
