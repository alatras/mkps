import { AssetType, Nft, NftStatus } from '../schemas/nft.schema'
import * as MUUID from 'uuid-mongodb'
import { NftHistory } from '../schemas/nft-history.schema'
import { AuctionStatus, AuctionType, Currency } from '../../shared/enum'
import { HistoryType } from '../../shared/enum/historyType'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'

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
    type: HistoryType.bid
  }
}

export const getNftEdition = (): NftEdition => {
  return {
    _id: MUUID.from('218f9288-48e3-11ed-b878-0242ac120002'),
    name: 'test',
    avnId: '3d94506a-e29b-4cfe-b20c-3f65653245fa',
    listingIndex: 10,
    availableCount: 10,
    quantity: 2,
    ownedCount: 1,
    isHidden: false,
    nfts: [MUUID.from('3d94506a-e29b-4cfe-b20c-3f65653245fa')]
  }
}

export const getEditionListing = (): EditionListing => {
  return {
    _id: MUUID.from('218f9288-48e3-11ed-b878-0242ac120002'),
    edition: { _id: MUUID.from('218f9288-48e3-11ed-b878-0242ac120002') },
    seller: {
      _id: MUUID.from('218f9288-48e3-11ed-b878-0242ac120002'),
      ethAddress: 'address',
      avnPubKey: ''
    },
    currency: Currency.ADA,
    status: AuctionStatus.open,
    reservePrice: '',
    winner: null,
    type: AuctionType.airdrop,
    endTime: new Date(),
    requestId: '',
    quantity: 10
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
