import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { NftController } from '../nft.controller'
import { NftService } from '../nft.service'
import { Nft } from '../schemas/nft.schema'
import { getEditionListing, getMockNft, getMockNftHistory, getNftEdition } from './mocks'
import { NftHistory } from '../schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'

describe('NftController', () => {
  let controller: NftController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NftController],
      providers: [
        NftService,
        EditionService,
        EditionListingService,
        { provide: getModelToken(NftHistory.name), useValue: getMockNftHistory() },
        { provide: getModelToken(Nft.name), useValue: getMockNft() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        { provide: getModelToken(EditionListing.name), useValue: getEditionListing() },
      ],
    }).compile()

    controller = module.get<NftController>(NftController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
