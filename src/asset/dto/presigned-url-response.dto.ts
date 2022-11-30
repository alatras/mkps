import { IsString, ValidateNested } from 'class-validator'
import { Exclude, Expose, Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

@Exclude()
class Fields {
  @Expose()
  @ApiProperty()
  @IsString()
  'X-Amz-Signature': string

  @Expose()
  @ApiProperty()
  @IsString()
  policy: string

  @Expose()
  @ApiProperty()
  @IsString()
  additionalProp1: string

  @Expose()
  @ApiProperty()
  @IsString()
  additionalProp2: string

  @Expose()
  @ApiProperty()
  @IsString()
  additionalProp3: string
}

@Exclude()
class Data {
  @Expose()
  @ApiProperty()
  @IsString()
  url: string

  @Expose()
  @ApiProperty()
  @ValidateNested()
  @Type(() => Fields)
  fields: Fields

  @Expose()
  @ApiProperty()
  @IsString()
  presignedGetUrl: string

  @Expose()
  @ApiProperty()
  @IsString()
  fileName: string
}

@Exclude()
export class PresignedUrlResponse {
  @Expose()
  @ApiProperty()
  @ValidateNested()
  @Type(() => Data)
  data: Data

  @Expose()
  @ApiProperty()
  @IsString()
  message: string
}
