import { getModelToken } from '@nestjs/mongoose'
import { HttpService } from '@nestjs/axios'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'
import { getQueueToken } from '@nestjs/bull'
import { User } from '../../user/schemas/user.schema'
import { NftService } from '../../nft/services/nft.service'
import { UserMock, getMockUser } from '../../user/test/mocks'
import { UserService } from '../../user/user.service'
import { AvnTransactionService } from '../services/avn-transaction.service'
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
import { LogService } from '../../log/log.service'
import { AvnTransactionApiGatewayService } from '../services/avn-transaction-api-gateway.service'
import { PaymentService } from '../../payment/services/payment.service'
import { ListingService } from '../../listing/listing.service'
import { Auction } from '../../listing/schemas/auction.schema'
import {
  BullMqService,
  MAIN_BULL_QUEUE_NAME
} from '../../bull-mq/bull-mq.service'
import { Auth0Service } from '../../user/auth0.service'
import { StripeService } from '../../payment/stripe/stripe.service'
import { Bid } from '../../payment/schemas/bid.dto'
import { S3Service } from '../../common/s3/s3.service'
import { EmailService } from '../../common/email/email.service'
import { FixedPriceService } from '../../listing/fixed-price/fixed-price.service'
import { AvnTransactionApiSetupService } from '../services/avn-transaction-api-setup.service'
import { VaultService } from '../../vault/services/vault.service'
import { RedisService } from '../../common/redis/redis.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

const bullMqServiceMock = () => ({
  addToQueue: jest.fn(),
  addSendEmailJob: jest.fn()
})

const mockAxios = () => ({
  get: jest.fn(),
  post: jest.fn()
})

const mockVaultService = () => ({
  someMethod: jest.fn()
})

describe('AvnTransactionService', () => {
  let service: AvnTransactionService

  const mockQueue = {
    add: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        ConfigService,
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: new UserMock(getMockUser())
        },
        StripeService,
        Auth0Service,
        AvnTransactionService,
        AvnTransactionApiGatewayService,
        NftService,
        {
          provide: RedisService,
          useValue: {}
        },
        EditionService,
        S3Service,
        EmailService,
        {
          provide: VaultService,
          useFactory: mockVaultService
        },
        HttpService,
        {
          provide: 'AXIOS_INSTANCE_TOKEN',
          useFactory: mockAxios
        },
        EditionListingService,
        AvnTransactionApiSetupService,
        PaymentService,
        ListingService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        FixedPriceService,
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
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(Bid.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
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

    service = module.get<AvnTransactionService>(AvnTransactionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
