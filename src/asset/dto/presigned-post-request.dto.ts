import { IsNotEmpty, IsString } from 'class-validator'

class Fields {
  @IsString()
  policy?: string;

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
