import { Prop, Schema } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'

@Schema({ _id: false })
export class Owner {
  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: MUUID.MUUID

  @Prop({ required: false, default: null })
  avnPubKey: string
}
