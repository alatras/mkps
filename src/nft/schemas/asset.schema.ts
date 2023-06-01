import { Prop } from '@nestjs/mongoose'

export class Asset {
  @Prop({ type: String, required: true })
  url: string

  @Prop({ type: String, required: true })
  key: string

  @Prop({
    type: String,
    required: true
  })
  type: string
}

export class ImagesSet {
  @Prop({ type: Asset })
  small: Asset

  @Prop({ type: Asset })
  medium?: Asset

  @Prop({ type: Asset })
  large: Asset

  @Prop({ type: Asset })
  original: Asset
}
