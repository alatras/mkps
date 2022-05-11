import { Exclude, Expose, Transform, Type } from 'class-transformer'
import { IsArray, IsString } from 'class-validator'
import { AuthProvider, User } from '../schemas/user.schema'
import * as MUUID from 'uuid-mongodb'

@Exclude()
export class UserResponseDto {
  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  _id: string

  @Expose()
  @IsString()
  avnPubKey: string

  @Expose()
  @IsString()
  stripeCustomerId: string

  @Expose()
  @IsString()
  stripeAccountId: string

  @Expose()
  @IsArray()
  ethAddresses: string[]

  @Expose()
  @Type(() => AuthProvider)
  provider: AuthProvider

  constructor(partial: Partial<User>) {
    Object.assign(this, partial)
  }
}
