import { Document } from 'mongoose'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'

// export type UserDocument = User & Document

export enum Provider {
  auth0 = 'google-oauth2'
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

@Schema({ _id: false })
export class AuthProvider {
  @Prop()
  id: string

  @Prop({
    type: String,
    required: true,
    enum: Object.keys(Provider),
    default: Provider.auth0
  })
  name: Provider

  @Prop({})
  updatedAt: Date

  @Prop()
  createdAt: Date

  @Prop(raw(Auth0UserMetadata))
  metadata?: Record<string, any>
}

@Schema({ collection: 'users' })
export class User extends Document {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop({ required: false, default: null })
  avnPubKey: string

  @Prop({ required: false, default: null })
  stripeCustomerId: string

  @Prop({ required: false, default: null })
  stripeAccountId: string

  @Prop({ type: AuthProvider })
  provider: AuthProvider

  @Prop([String])
  ethAddresses: string[]
}

export const UserSchema = SchemaFactory.createForClass(User)
