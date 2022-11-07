import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { EditionService } from '../edition.service'
import { NftEdition } from '../schemas/edition.schema'
import {
  getNftEdition,
  getMockNft,
  getEditionListing,
  getMockNftHistory
} from '../../nft/test/mocks'
import { Nft } from '../../nft/schemas/nft.schema'
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { LogService } from '../../log/log.service'
import { NftService } from '../../nft/services/nft.service'
import { NftHistory } from '../../nft/schemas/nft-history.schema'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('EditionService', () => {
  let service: EditionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditionListingService,
        EditionService,
        LogService,
        NftService,
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        { provide: getModelToken(Nft.name), useValue: getMockNft() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ]
    }).compile()

    service = module.get<EditionService>(EditionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
