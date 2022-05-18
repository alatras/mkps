import { AssetType, Nft, NftStatus } from '../schemas/nft.schema'
import * as MUUID from 'uuid-mongodb'

export const getMockNft = (): Nft => {
  return {
    _id: MUUID.from('3d94506a-e29b-4cfe-b20c-3f65653245fb'),
    minterId: MUUID.from('4dbf07a9-f8a7-4d35-94e6-08192dbee337'),
    assets: [{ type: AssetType.video, url: 'string', key: 'string' }],
    isHidden: true,
    unlockableContent: {
      preview: 'string',
      quantity: 1,
      claimedCount: 0,
      details: 'string'
    },
    image: {
      small: { type: AssetType.image, key: 'string', url: 'string' },
      medium: { type: AssetType.image, key: 'string', url: 'string' },
      large: { type: AssetType.image, key: 'string', url: 'string' },
      original: { type: AssetType.image, key: 'string', url: 'string' }
    },
    status: NftStatus.draft,
    owner: MUUID.from('8264024d-0a22-43b9-b0eb-091ca4284da2'),
    ethAddresses: [],
    createdAt: new Date('2022-05-18T13:23:39.468Z'),
    updatedAt: new Date('2022-05-18T13:23:39.468Z'),
    properties: {}
  }
}

export class NftMock {
  constructor(private data) {}
  create = jest.fn().mockResolvedValue(this.data)
  static find = jest.fn().mockResolvedValue([getMockNft()])
  static findOne = jest.fn().mockResolvedValue(getMockNft())
  static findOneAndUpdate = jest.fn().mockResolvedValue(getMockNft())
  static deleteOne = jest.fn().mockResolvedValue(true)
}
