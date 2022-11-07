import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { EditionListingService } from '../services/edition-listing.service'
import { EditionListing } from '../schemas/edition-listing.schema'
import { getEditionListing } from '../../nft/test/mocks'

describe('EditionListingService', () => {
  let service: EditionListingService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditionListingService,
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ]
    }).compile()

    service = module.get<EditionListingService>(EditionListingService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
