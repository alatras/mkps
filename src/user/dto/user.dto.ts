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
import { ApiProperty } from '@nestjs/swagger'

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
  @ApiProperty()
  optIn: boolean
}

export class NotificationPreferencesDto {
  @IsBoolean()
  @ApiProperty()
  unsubscribedEmail: boolean

  @IsBoolean()
  @ApiProperty()
  sellerEmail: boolean

  @IsBoolean()
  @ApiProperty()
  bidderEmail: boolean
}

export class UpdateUserDto {
  @Expose()
  @IsString()
  @ApiProperty({ required: false })
  readonly username?: string

  @Expose()
  @IsString()
  @ApiProperty({ required: false })
  readonly email?: string

  @Expose()
  @ApiProperty({ required: false })
  readonly leaderboard?: LeaderboardDto

  @Expose()
  @ApiProperty({ required: false })
  readonly notificationPreferences?: NotificationPreferencesDto
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
  @ApiProperty()
  _id: string

  @Expose()
  @IsString()
  @ApiProperty()
  avnPubKey: string

  @Expose()
  @IsString()
  @ApiProperty()
  stripeCustomerId: string

  @Expose()
  @IsString()
  @ApiProperty()
  stripeAccountId: string

  @Expose()
  @IsString()
  @ApiProperty()
  username: string

  @Expose()
  @IsString()
  @ApiProperty()
  email: string

  @Expose()
  @IsArray()
  @ApiProperty()
  ethAddresses: string[]

  @Expose()
  @Type(() => AuthProvider)
  @ApiProperty()
  provider: AuthProvider

  constructor(partial: Partial<User>) {
    Object.assign(this, partial)
  }
}
