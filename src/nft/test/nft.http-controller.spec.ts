import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'
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
import { ListingService } from '../../listing/listing.service'
import { Auction } from '../../listing/schemas/auction.schema'
import { PaymentService } from '../../payment/services/payment.service'
import {
  BullMqService,
  MAIN_BULL_QUEUE_NAME
} from '../../bull-mq/bull-mq.service'
import { StripeService } from '../../payment/stripe/stripe.service'
import { Auth0Service } from '../../user/auth0.service'
import { Bid } from '../../payment/schemas/bid.dto'
import { S3Service } from '../../common/s3/s3.service'
import { EmailService } from '../../common/email/email.service'
import { FixedPriceService } from '../../listing/fixed-price/fixed-price.service'
import { AvnTransactionApiSetupService } from '../../avn-transaction/services/avn-transaction-api-setup.service'
import { VaultService } from '../../vault/services/vault.service'
import { HttpService } from '@nestjs/axios'
import { UserService } from '../../user/user.service'
import { User } from '../../user/schemas/user.schema'
import { UserMock, getMockUser } from '../../user/test/mocks'
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
        StripeService,
        Auth0Service,
        ConfigService,
        {
          provide: RedisService,
          useValue: {}
        },
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: new UserMock(getMockUser())
        },
        NftService,
        {
          provide: VaultService,
          useFactory: mockVaultService
        },
        HttpService,
        {
          provide: 'AXIOS_INSTANCE_TOKEN',
          useFactory: mockAxios
        },
        EditionService,
        EditionListingService,
        LogService,
        AvnTransactionApiSetupService,
        PaymentService,
        S3Service,
        EmailService,
        ListingService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        FixedPriceService,
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
          provide: getModelToken(Bid.name),
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
      ],
      imports: [ConfigModule.forRoot({ load: [config] })]
    }).compile()

    controller = module.get<NftHttpController>(NftHttpController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
