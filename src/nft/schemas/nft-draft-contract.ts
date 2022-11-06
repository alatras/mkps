import { Prop } from '@nestjs/mongoose'
import { Transform, Type } from 'class-transformer'
import * as MUUID from 'uuid-mongodb'
import { User } from '../../user/schemas/user.schema'
import { Asset, ImagesSet } from './asset.schema'
import { Owner } from '../../shared/sub-schemas/owner.schema'
import { UnlockableContent } from './nft.schema'

export class NftDraftContract {
  @Prop()
  id?: string

  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    ref: User.name,
    required: true
  })
  @Transform(({ value }) => MUUID.from(value).toString())
  @Type(() => User)
  minterId: object

  @Prop([Asset])
  assets?: Asset[]

  @Prop({ required: true })
  isHidden: boolean

  @Prop({ type: UnlockableContent })
  unlockableContent?: UnlockableContent

  @Prop()
  isMinted?: boolean

  @Prop()
  avnAddress?: string

  @Transform(({ value }) => MUUID.from(value).toString())
  @Prop({
    type: 'object',
    value: { type: 'Buffer' },
    default: () => MUUID.v4()
  })
  editionId?: MUUID.MUUID

  @Prop()
  eid?: string

  @Prop()
  year?: string

  @Prop({ type: ImagesSet })
  image?: ImagesSet

  @Prop({ type: Owner })
  owner: Owner
}
