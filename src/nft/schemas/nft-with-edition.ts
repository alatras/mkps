import { Prop } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Nft } from './nft.schema'
import { IsNumber } from 'class-validator'

export class NftWithEdition extends Nft {
  @Prop()
  @IsNumber()
  editionNumber: number

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  edition: MUUID.MUUID
}
