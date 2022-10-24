import { AssetType } from './nft.schema'
import { Type } from 'class-transformer'
import { Prop, Schema } from "@nestjs/mongoose";

@Schema({ _id: false, typeKey: '$type' })
export class Asset {
  @Prop({ $type: String, required: true })
  url: string

  @Prop({ $type: String, required: true })
  key: string

  @Prop({
    $type: String,
    enum: AssetType,
    required: true
  })
  type: AssetType
}

@Schema({ _id: false })
export class ImagesSet {
  @Prop({ type: Asset })
  @Type(() => Asset)
  small: Asset

  @Prop({ type: Asset })
  @Type(() => Asset)
  medium: Asset

  @Prop({ type: Asset })
  @Type(() => Asset)
  large: Asset

  @Prop({ type: Asset })
  @Type(() => Asset)
  original: Asset
}
