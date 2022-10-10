import { AssetType, Nft, NftStatus } from '../schemas/nft.schema'
import * as MUUID from 'uuid-mongodb'
import { NftHistory } from '../schemas/nft-history.schema'
import { AuctionType, Currency } from '../../shared/enum'
import { HistoryType } from '../../shared/enum/historyType'

export const getMockNft = (): Nft => {
  return {
    _id: MUUID.from('15e3da3c-542b-4375-9b9d-2115413b8f4c'),
    minterId: MUUID.from('0bfdc700-48e3-11ed-b878-0242ac120002'),
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
    owner: MUUID.from('17ef1ff0-48e3-11ed-b878-0242ac120002'),
    ethAddresses: [],
    createdAt: new Date('2022-05-18T13:23:39.468Z'),
    updatedAt: new Date('2022-05-18T13:23:39.468Z'),
    properties: {}
  }
}

export const getMockNftHistory = (): NftHistory => {
  return {
    _id: MUUID.from('218f9288-48e3-11ed-b878-0242ac120002'),
    nftId: MUUID.from('3d94506a-e29b-4cfe-b20c-3f65653245fc'),
    auctionId: MUUID.from('3d94506a-e29b-4cfe-b20c-3f65653245fa'),
    userAddress: 'some address',
    fromAddress: 'from',
    saleType: AuctionType.airdrop,
    amount: '10',
    toAddress: 'to some address',
    transactionHash: 'hash',
    currency: Currency.ADA,
    type: HistoryType.bid,
  }
}

export class NftMock {
  constructor(private data) { }
  create = jest.fn().mockResolvedValue(this.data)
  static find = jest.fn().mockResolvedValue([getMockNft()])
  static findOne = jest.fn().mockResolvedValue(getMockNft())
  static findOneAndUpdate = jest.fn().mockResolvedValue(getMockNft())
  static deleteOne = jest.fn().mockResolvedValue(true)
}
