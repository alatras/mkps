import { Document } from 'mongoose'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { DbCollections } from '../../shared/enum'
import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

export enum Provider {
  auth0 = 'auth0',
  ethereum = 'oauth2|siwe'
}

export const Auth0UserMetadata = {
  /** ADA balance kept as smallest denominator value. It's a string type because of big numbers and risk of overflowing
   * if ADA=1 => adaBalance=1000000
   * if ADA=1.00089 => adaBalance=1000890
   */
  adaBalance: { type: String },
  adaDepositAddress: { type: String },
  kycStatus: { type: String }
}

@Schema({ _id: false, timestamps: true })
export class AuthProvider {
  @Prop()
  @ApiProperty()
  id: string

  @Prop({
    type: String,
    required: true,
    enum: Provider,
    default: Provider.auth0
  })
  @ApiProperty()
  name: Provider

  @Prop()
  @ApiProperty()
  updatedAt: Date

  @Prop()
  @ApiProperty()
  createdAt: Date

  @Prop(raw(Auth0UserMetadata))
  @ApiProperty()
  metadata?: Record<string, any>

  constructor(partial: Partial<AuthProvider>) {
    Object.assign(this, partial)
  }
}

@Schema()
export class NotificationPreferences {
  @IsBoolean()
  @Prop({ type: Boolean, default: false })
  unsubscribedEmail: boolean

  @IsBoolean()
  @Prop({ type: Boolean, default: true })
  sellerEmail: boolean

  @IsBoolean()
  @Prop({ type: Boolean, default: true })
  bidderEmail: boolean
}

@Schema({
  collection: DbCollections.Users,
  versionKey: false,
  autoCreate: true,
  timestamps: true
})
export class User {
  @Transform(({ value }) => value.toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: MUUID.MUUID

  @Prop({ required: false, default: null })
  avnPubKey: string

  @Prop({ required: false, default: null })
  stripeCustomerId: string

  @Prop({ required: false, default: null })
  stripeAccountId: string

  @Prop({ type: AuthProvider })
  @Type(() => AuthProvider)
  provider: AuthProvider

  @Prop([String])
  ethAddresses: string[]

  @Prop({ required: false, default: null })
  username?: string

  @Prop({ required: false, default: null })
  email?: string

  @Prop({ required: false, default: null })
  avnAddress?: string

  @Prop({
    type: NotificationPreferences,
    default: new NotificationPreferences()
  })
  @Type(() => NotificationPreferences)
  notificationPreferences: NotificationPreferences

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const UserSchema = SchemaFactory.createForClass(User)

export type UserDocument = User & Document
