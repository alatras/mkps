import { getModelToken } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition
} from '../../nft/test/mocks'
import { EditionService } from '../edition.service'
import { NftEdition } from '../schemas/edition.schema'
import { Nft } from '../../nft/schemas/nft.schema'
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftService } from '../../nft/services/nft.service'
import { LogService } from '../../log/log.service'
import { NftHistory } from '../../nft/schemas/nft-history.schema'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../../avn-transaction/schemas/avn-transaction.schema'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { EditionController } from '../controllers/edition.http-controller'
import { AvnTransactionApiGatewayService } from '../../avn-transaction/services/avn-transaction-api-gateway.service'

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
        AvnTransactionApiGatewayService,
        ConfigService,
        AvnTransactionService,
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
          provide: getModelToken(AvnNftTransaction.name),
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
