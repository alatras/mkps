import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { EditionService } from './edition.service'
import { NftEdition } from '../edition/schemas/edition.schema'
import { getNftEdition, getMockNft, getEditionListing } from '../nft/test/mocks'
import { Nft } from '../nft/schemas/nft.schema'
import { EditionListingService } from '../edition-listing/edition-listing.service'
import { EditionListing } from '../edition-listing/schemas/edition-listing.schema'

describe('EditionService', () => {
  let service: EditionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditionListingService,
        EditionService,
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
