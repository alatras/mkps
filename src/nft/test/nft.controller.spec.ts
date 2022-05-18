import { Test, TestingModule } from '@nestjs/testing'
import { NftController } from '../nft.controller'
import { NftService } from '../nft.service'
import { getModelToken } from '@nestjs/mongoose'
import { Nft } from '../schemas/nft.schema'
import { getMockNft } from './mocks'

describe('NftController', () => {
  let controller: NftController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NftController],
      providers: [
        NftService,
        { provide: getModelToken(Nft.name), useValue: getMockNft() }
      ]
    }).compile()

    controller = module.get<NftController>(NftController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
