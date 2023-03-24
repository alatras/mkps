import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'
import { getQueueToken } from '@nestjs/bull'
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
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftMsController } from '../controllers/nft.ms-controller'
import { LogService } from '../../log/log.service'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../../avn-transaction/schemas/avn-transaction.schema'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { getModelToken } from '@nestjs/mongoose'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { AvnTransactionApiGatewayService } from '../../avn-transaction/services/avn-transaction-api-gateway.service'
import { PaymentService } from '../../payment/payment.service'
import { ListingService } from '../../listing/listing.service'
import { Auction } from '../../listing/schemas/auction.schema'
import {
  BullMqService,
  MAIN_BULL_QUEUE_NAME
} from '../../bull-mq/bull-mq.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('NftMsController', () => {
  let controller: NftMsController
  let service: NftService

  const mockQueue = {
    add: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NftMsController],
      providers: [
        NftService,
        EditionService,
        EditionListingService,
        AvnTransactionService,
        AvnTransactionApiGatewayService,
        ConfigService,
        PaymentService,
        LogService,
        ListingService,
        BullMqService,
        {
          provide: getQueueToken(MAIN_BULL_QUEUE_NAME),
          useValue: mockQueue
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: getMockNftHistory()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        { provide: getModelToken(Nft.name), useValue: getMockNft() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ],
      imports: [ConfigModule.forRoot({ load: [config] })]
    }).compile()
    controller = module.get<NftMsController>(NftMsController)
    service = module.get<NftService>(NftService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('handleNftMinted', () => {
    it('should call the correct service function with the correct data', async () => {
      const testData = { nftId: '', anvNftId: '' }

      jest
        .spyOn(service, 'handleNftMinted')
        .mockImplementationOnce(() => Promise.resolve())

      await controller.handleNftMinted(testData)

      expect(service.handleNftMinted).toBeCalledWith(
        testData.nftId,
        testData.anvNftId
      )
    })
  })
})
