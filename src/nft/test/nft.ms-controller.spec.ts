import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { NftService } from '../services/nft.service'
import { Nft } from '../schemas/nft.schema'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition
} from './mocks'
import { NftHistory } from '../schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftMsController } from '../controllers/nft.ms-controller'

describe('NftMsController', () => {
  let controller: NftMsController
  let service: NftService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NftMsController],
      providers: [
        NftService,
        EditionService,
        EditionListingService,
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        { provide: getModelToken(Nft.name), useValue: getMockNft() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ]
    }).compile()
    controller = module.get<NftMsController>(NftMsController)
    service = module.get<NftService>(NftService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('handleNftMinted', () => {
    it('should call the correct service function with the correct data', async () => {
      const testData = { nftId: '', eid: '' }

      jest
        .spyOn(service, 'handleNftMinted')
        .mockImplementationOnce(() => Promise.resolve())

      await controller.handleNftMinted(testData)

      expect(service.handleNftMinted).toBeCalledWith(
        testData.nftId,
        testData.eid
      )
    })
  })
})
