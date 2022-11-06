import { Exclude, Expose, Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
  IsEmail
} from 'class-validator'
import { AuthProvider, User } from '../schemas/user.schema'
import * as MUUID from 'uuid-mongodb'

export class AuthProviderDto {
  @IsString()
  id: string

  @IsString()
  name: string
}

export class CreateUserDto {
  @ValidateNested()
  @Type(() => AuthProvider)
  provider: AuthProviderDto
}

export class LeaderboardDto {
  @IsBoolean()
  optIn: boolean
}

export class NotificationPreferencesDto {
  @IsBoolean()
  unsubscribedEmail: boolean

  @IsBoolean()
  sellerEmail: boolean

  @IsBoolean()
  bidderEmail: boolean
}

export class UpdateUserDto {
  @Expose()
  @IsString()
  username: string

  @Expose()
  @IsString()
  email: string

  @Expose()
  leaderboard: LeaderboardDto

  @Expose()
  notificationPreferences: NotificationPreferencesDto
}

export class UpdateAuth0Dto {
  @IsEmail()
  email: string
}

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
  @IsString()
  username: string

  @Expose()
  @IsString()
  email: string

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
