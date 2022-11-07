import { Test, TestingModule } from '@nestjs/testing'
import { EditionListingController } from '../controllers/edition-listing.controller'

describe('EditionListingController', () => {
  let controller: EditionListingController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditionListingController]
    }).compile()

    controller = module.get<EditionListingController>(EditionListingController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
