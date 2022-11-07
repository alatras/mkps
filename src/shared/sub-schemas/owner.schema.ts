import { Prop, Schema } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import { IsString } from 'class-validator'
import * as MUUID from 'uuid-mongodb'

@Schema({ _id: false })
export class Owner {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    required: false,
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  @IsString()
  _id: MUUID.MUUID

  @Prop({ required: false, default: null })
  @IsString()
  avnPubKey: string

  @Prop({ required: false, default: null })
  @IsString()
  userName?: string
}
