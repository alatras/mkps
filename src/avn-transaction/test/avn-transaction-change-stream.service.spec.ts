import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getQueueToken } from '@nestjs/bull'
import { User } from '../../user/schemas/user.schema'
import { NftService } from '../../nft/services/nft.service'
import { getMockUser } from '../../user/test/mocks'
import { UserService } from '../../user/user.service'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../schemas/avn-transaction.schema'
import { getAvnTransaction } from './mocks'
import { Nft } from '../../nft/schemas/nft.schema'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition,
  NftMock
} from '../../nft/test/mocks'
import { NftHistory } from '../../nft/schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { AvnTransactionChangeStreamService } from '../services/avn-transaction-change-stream.service'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { LogService } from '../../log/log.service'
import { AvnTransactionApiGatewayService } from '../services/avn-transaction-api-gateway.service'
import { PaymentService } from '../../payment/services/payment.service'
import { ListingService } from '../../listing/listing.service'
import { Auction } from '../../listing/schemas/auction.schema'
import { ConfigModule } from '@nestjs/config'
import config from '../../config/app.config'
import {
  BullMqService,
  MAIN_BULL_QUEUE_NAME
} from '../../bull-mq/bull-mq.service'
import { Auth0Service } from '../../user/auth0.service'
import { StripeService } from '../../payment/stripe/stripe.service'
import { Bid } from '../../payment/schemas/bid.dto'
import { S3Service } from '../../common/s3/s3.service'
import { EmailService } from '../../common/email/email.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('AvnTransactionChangeStreamService', () => {
  let service: AvnTransactionChangeStreamService
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let testClientProxy

  const mockQueue = {
    add: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        AvnTransactionChangeStreamService,
        AvnTransactionService,
        AvnTransactionApiGatewayService,
        NftService,
        LogService,
        EditionService,
        ConfigService,
        EmailService,
        S3Service,
        StripeService,
        Auth0Service,
        EditionListingService,
        PaymentService,
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
        { provide: getModelToken(User.name), useValue: getMockUser() },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Bid.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(Auction.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ],
      imports: [ConfigModule.forRoot({ load: [config] })]
    }).compile()

    testClientProxy = await module.get('TRANSPORT_CLIENT')

    service = module.get<AvnTransactionChangeStreamService>(
      AvnTransactionChangeStreamService
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
