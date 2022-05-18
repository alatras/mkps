import { Test, TestingModule } from '@nestjs/testing'
import { NftService } from '../nft.service'
import { getModelToken } from '@nestjs/mongoose'
import { AssetType, Nft } from '../schemas/nft.schema'
import { getMockNft, NftMock } from './mocks'
import * as MUUID from 'uuid-mongodb'

describe('NftService', () => {
  let service: NftService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftService,
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
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
