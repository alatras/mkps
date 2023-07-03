import { Exclude, Expose, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
  IsEmail
} from 'class-validator'
import { AuthProvider, User, UserLeaderboard } from '../schemas/user.schema'
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
  id?: string

  @Expose()
  @IsString()
  @ApiProperty()
  avnPubKey: string

  @Expose()
  @IsString()
  @ApiProperty()
  avnAddress: string

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
  @Type(() => UserLeaderboard)
  @ApiProperty()
  leaderboard?: LeaderboardDto

  @Expose()
  @IsString()
  @ApiProperty()
  avatarUrl?: string

  @Expose()
  @Type(() => AuthProvider)
  @ApiProperty()
  provider: AuthProvider

  constructor(partial: Partial<User>) {
    const { _id, ...rest } = partial

    Object.assign(this, {
      ...rest,
      id: partial._id.toString()
    })
  }
}
