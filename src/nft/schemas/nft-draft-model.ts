import { Prop } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Asset, ImagesSet } from './asset.schema'
import { Owner } from '../../shared/sub-schemas/owner.schema'
import { UnlockableContent } from './nft.schema'
import { IsBoolean } from 'class-validator'
import { NftStatus } from 'src/shared/enum'

export class NftDraftModel {
  @Transform(({ value }) => value.toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id?: MUUID.MUUID

  @Prop({ type: Owner })
  owner: Owner

  @Prop({ type: ImagesSet })
  image: ImagesSet

  @Prop()
  @IsBoolean()
  isMinted?: boolean

  @Prop({ type: NftStatus })
  status?: NftStatus

  @Prop([Asset])
  assets?: Asset[]

  @Prop()
  @IsBoolean()
  isHidden: boolean

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop()
  minterId: MUUID.MUUID

  @Prop({ type: UnlockableContent })
  unlockableContent?: UnlockableContent

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  editionId?: MUUID.MUUID

  @Prop()
  name: string

  @Prop({ type: 'object' })
  properties: Record<string, any>

  @Prop()
  editionNumber?: number
}
