import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition
} from '../../nft/test/mocks'
import { EditionController } from '../controllers/edition.http-controller'
import { EditionService } from '../edition.service'
import { NftEdition } from '../schemas/edition.schema'
import { Nft } from '../../nft/schemas/nft.schema'
import { EditionListingService } from '../../edition-listing/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftService } from '../../nft/services/nft.service'
import { LogService } from '../../log/log.service'
import { NftHistory } from '../../nft/schemas/nft-history.schema'
import { AvnEditionTransaction } from '../../avn-transaction/schemas/avn-transaction.schema'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('EditionController', () => {
  let controller: EditionController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditionController],
      providers: [
        { provide: getModelToken(Nft.name), useValue: getMockNft() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        EditionService,
        EditionListingService,
        NftService,
        LogService,
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        }
      ]
    }).compile()

    controller = module.get<EditionController>(EditionController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
