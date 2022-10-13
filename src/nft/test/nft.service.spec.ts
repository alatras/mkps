import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import * as MUUID from 'uuid-mongodb'
import { NftService } from '../nft.service'
import { AssetType, Nft } from '../schemas/nft.schema'
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
import { EditionListingService } from '../../edition-listing/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'

describe('NftService', () => {
  let service: NftService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftService,
        EditionService,
        EditionListingService,
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
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
      try {
        const nft = await service.create(MUUID.v4().toString(), {
          name: 'string',
          properties: {},
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
            details: 'string'
          }
        })

        expect(JSON.stringify(nft)).toBe(JSON.stringify(getMockNft()))
      } catch (e) {
        throw e
      }
    })
  })
})
