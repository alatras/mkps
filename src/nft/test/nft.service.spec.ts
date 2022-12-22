import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import * as MUUID from 'uuid-mongodb'
import { NftService } from '../services/nft.service'
import { AssetType, Nft } from '../schemas/nft.schema'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../../avn-transaction/schemas/avn-transaction.schema'
import {
  getEditionListing,
  getMockNft,
  NftMock,
  getMockNftHistory,
  getNftEdition
} from './mocks'
import { NftHistory } from '../schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftStatus } from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { HistoryType } from '../../shared/enum'
import { LogService } from '../../log/log.service'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { CreateNftDto } from '../dto/nft.dto'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('NftService', () => {
  let service: NftService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftService,
        EditionService,
        EditionListingService,
        AvnTransactionService,
        LogService,
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ]
    }).compile()

    service = module.get<NftService>(NftService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new NFT', async () => {
      const nftDto: CreateNftDto = {
        name: 'string',
        properties: {},
        sport: 'basket',
        collection: 'basketters',
        athlete: 'Jake All',
        artist: 'Jake Half',
        description: 'super test collection',
        image: {
          small: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          },
          medium: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          },
          large: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          },
          original: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          }
        },
        assets: [
          {
            url: 'string',
            key: 'string',
            type: AssetType.video
          }
        ],
        unlockableContent: {
          preview: 'string',
          quantity: 1,
          details: 'string',
          claimedCount: 0
        }
      }

      try {
        const createMintAvnTransaction = jest
          .spyOn(
            AvnTransactionService.prototype as any,
            'createMintAvnTransaction'
          )
          .mockImplementationOnce(() => Promise.resolve({ request_id: '555' }))

        const res = await service.create(MUUID.v4().toString(), nftDto)

        expect(createMintAvnTransaction).toHaveBeenCalled()

        expect(JSON.stringify(res)).toBe(JSON.stringify({ requestId: '555' }))
      } catch (e) {
        throw e
      }
    })
  })

  describe('handleNftMinted', () => {
    it('should call the correct functions with the correct data', async () => {
      const mockNft: Nft = getMockNft()

      jest
        .spyOn(service, 'updateOneById')
        .mockImplementationOnce(() => Promise.resolve(getMockNft()))

      jest
        .spyOn(service, 'addHistory')
        .mockImplementationOnce(() => Promise.resolve())

      await service.handleNftMinted(
        uuidFrom(mockNft._id).toString(),
        mockNft.eid
      )

      expect(service.updateOneById).toBeCalledWith(
        uuidFrom(mockNft._id).toString(),
        {
          eid: mockNft.eid,
          status: NftStatus.minted
        }
      )

      expect(service.updateOneById).toBeCalledWith(
        uuidFrom(mockNft._id).toString(),
        {
          eid: mockNft.eid,
          status: NftStatus.minted
        }
      )

      expect(service.addHistory).toBeCalledWith({
        nftId: uuidFrom(mockNft._id).toString(),
        userAddress: mockNft.owner.avnPubKey,
        type: HistoryType.minted
      })
    })
  })
})
