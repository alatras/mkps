import { Prop } from '@nestjs/mongoose'
import { Expose, Transform } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { Asset, ImagesSet } from './asset.schema'
import { Owner } from '../../shared/sub-schemas/owner.schema'
import { UnlockableContent } from './nft.schema'
import { IsBoolean, IsString } from 'class-validator'

export class NftDraftModel {
  @Transform(({ value }) => value.toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  _id: object

  @Prop({ type: Owner })
  owner: Owner

  @Prop({ type: ImagesSet })
  image?: ImagesSet

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  editionId?: MUUID.MUUID

  @Prop()
  @IsBoolean()
  isMinted?: boolean

  @Prop([Asset])
  assets?: Asset[]

  @Prop()
  @IsBoolean()
  isHidden: boolean

  @Expose()
  @Transform(({ value }) => MUUID.from(value).toString())
  @IsString()
  minterId: string

  @Prop({ type: UnlockableContent })
  unlockableContent: UnlockableContent
}
