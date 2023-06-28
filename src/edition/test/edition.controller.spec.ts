import { getModelToken } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'
import { getQueueToken } from '@nestjs/bull'
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
import { PaymentService } from '../../payment/services/payment.service'
import { ListingService } from '../../listing/listing.service'
import { Auction } from '../../listing/schemas/auction.schema'
import {
  BullMqService,
  MAIN_BULL_QUEUE_NAME
} from '../../bull-mq/bull-mq.service'
import { StripeService } from '../../payment/stripe/stripe.service'
import { Auth0Service } from '../../user/auth0.service'
import { Bid } from '../../payment/schemas/bid.dto'
import { EmailService } from '../../common/email/email.service'
import { S3Service } from '../../common/s3/s3.service'
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

describe('EditionController', () => {
  let controller: EditionController

  const mockQueue = {
    add: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditionController],
      providers: [
        AvnTransactionApiGatewayService,
        ConfigService,
        StripeService,
        {
          provide: RedisService,
          useValue: {}
        },
        Auth0Service,
        {
          provide: RedisService,
          useValue: {}
        },
        AvnTransactionService,
        PaymentService,
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: new UserMock(getMockUser())
        },
        {
          provide: VaultService,
          useFactory: mockVaultService
        },
        HttpService,
        {
          provide: 'AXIOS_INSTANCE_TOKEN',
          useFactory: mockAxios
        },
        ListingService,
        AvnTransactionApiSetupService,
        EmailService,
        S3Service,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        FixedPriceService,
        {
          provide: getQueueToken(MAIN_BULL_QUEUE_NAME),
          useValue: mockQueue
        },
        { provide: getModelToken(Nft.name), useValue: getMockNft() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: getEditionListing()
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
      ],
      imports: [ConfigModule.forRoot({ load: [config] })]
    }).compile()

    controller = module.get<EditionController>(EditionController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
