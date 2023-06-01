import { getModelToken } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../avn-transaction/schemas/avn-transaction.schema'
import { Auction } from './schemas/auction.schema'
import { LogService } from '../log/log.service'
import { Bid } from '../payment/schemas/bid.dto'
import { EmailService } from '../common/email/email.service'
import { EditionListingService } from '../edition-listing/services/edition-listing.service'
import { EditionListing } from '../edition-listing/schemas/edition-listing.schema'
import { AvnTransactionService } from '../avn-transaction/services/avn-transaction.service'
import { AvnTransactionApiGatewayService } from '../avn-transaction/services/avn-transaction-api-gateway.service'
import { NftEdition } from '../edition/schemas/edition.schema'
import { Test, TestingModule } from '@nestjs/testing'
import { ListingService } from './listing.service'
import { EditionService } from '../edition/edition.service'
import { Nft } from '../nft/schemas/nft.schema'
import { BullMqService } from '../bull-mq/bull-mq.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

const bullMqServiceMock = () => ({
  addToQueue: jest.fn(),
  addSendEmailJob: jest.fn()
})

describe('ListingService', () => {
  let service: ListingService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        ConfigService,
        LogService,
        EmailService,
        EditionListingService,
        EditionService,
        AvnTransactionService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        AvnTransactionApiGatewayService,
        {
          provide: getModelToken(Auction.name),
          useValue: {}
        },
        {
          provide: getModelToken(Bid.name),
          useValue: {}
        },
        {
          provide: getModelToken(Nft.name),
          useValue: {}
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: {}
        },
        {
          provide: getModelToken(EditionListing.name),
          useValue: {}
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: {}
        },
        { provide: getModelToken(NftEdition.name), useValue: {} },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        }
      ]
    }).compile()

    service = module.get<ListingService>(ListingService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
