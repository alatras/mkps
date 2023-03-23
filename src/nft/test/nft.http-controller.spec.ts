import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import { getQueueToken } from '@nestjs/bull'
import { NftHttpController } from '../controllers/nft.http-controller'
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
import { LogService } from '../../log/log.service'
import {
  AvnNftTransaction,
  AvnEditionTransaction
} from '../../avn-transaction/schemas/avn-transaction.schema'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
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

describe('NftHttpController', () => {
  let controller: NftHttpController

  const mockQueue = {
    add: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NftHttpController],
      providers: [
        AvnTransactionService,
        AvnTransactionApiGatewayService,
        ConfigService,
        NftService,
        EditionService,
        EditionListingService,
        LogService,
        PaymentService,
        ListingService,
        BullMqService,
        {
          provide: getQueueToken(MAIN_BULL_QUEUE_NAME),
          useValue: mockQueue
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: getAvnTransaction()
        },
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

    controller = module.get<NftHttpController>(NftHttpController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
