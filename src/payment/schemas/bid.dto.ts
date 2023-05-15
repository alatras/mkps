// import { Prop } from '@nestjs/mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import * as MUUID from 'uuid-mongodb'
import { Min } from 'class-validator'
import { BidStatus, Currency } from '../../shared/enum'
import { Transform } from 'class-transformer'
import { Owner } from '../../shared/sub-schemas/owner.schema'

export class StripePayment {
  @Prop({ type: String })
  paymentMethodId: string

  @Prop({ type: String })
  paymentIntentId: string

  @Prop({ type: Boolean })
  captured: boolean

  @Prop({ type: Boolean, required: false })
  failed?: boolean

  @Prop({ type: Boolean, required: false })
  canceled?: boolean
}

@Schema({ timestamps: true })
export class Bid {
  @Transform(({ value }) => value.toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: MUUID.MUUID

  @Prop({ type: String, required: false })
  preview?: string

  @Prop({ type: Number, required: false })
  @Min(0, { message: 'negative unlockable content quantity' })
  quantity?: number

  @Prop({ type: String, required: false })
  details?: string

  @Prop({ type: Number, required: false })
  claimedCount?: number

  @Prop({ type: String })
  auctionId: string

  @Prop({ type: Owner })
  owner: Owner

  @Prop({ type: String })
  transactionHash?: string

  // This is 'wei', the smallest denomination of ether.
  // An ETH is `10**18` wei.
  @Prop({ type: String })
  value: string

  @Prop({
    required: true,
    type: String,
    enum: Object.values(Currency)
  })
  currency: Currency

  @Prop({
    required: false,
    type: String,
    enum: Object.values(BidStatus)
  })
  status: BidStatus

  @Prop({ type: String, required: false })
  displayValue?: string

  @Prop({ type: StripePayment, required: false })
  stripe: StripePayment

  @Prop({ type: Date, required: false })
  createdAt?: Date
}

export const BidSchema = SchemaFactory.createForClass(Bid)
