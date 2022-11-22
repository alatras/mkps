import { Exclude, Expose, Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PresignedUrlUploadType } from 'src/shared/enum'
import { toNumber } from 'utils/toNumber';

class Fields {
  @IsString()
  policy?: string

  /** The fields that must be included as hidden inputs on the form. */
  [key: string]: string
}

export class PresignedUrlPostRequestDto {
  /** The URL that should be used as the action of the form. */
  @IsString()
  @IsNotEmpty()
  url: string

  /** The fields that must be included as hidden inputs on the form. */
  @IsNotEmpty()
  fields: Fields
}
