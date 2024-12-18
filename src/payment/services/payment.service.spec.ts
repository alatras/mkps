import { Test, TestingModule } from '@nestjs/testing'
import { PaymentService } from './payment.service'
import { getModelToken } from '@nestjs/mongoose'
import { HttpService } from '@nestjs/axios'
import { ListingService } from '../../listing/listing.service'
import { StripeService } from '../stripe/stripe.service'
import { EmailService } from '../../common/email/email.service'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { Bid } from '../schemas/bid.dto'
import { Auction } from '../../listing/schemas/auction.schema'
import {
  NftMock,
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition
} from '../../nft/test/mocks'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../../avn-transaction/schemas/avn-transaction.schema'
import { AvnTransactionApiGatewayService } from '../../avn-transaction/services/avn-transaction-api-gateway.service'
import { EditionService } from '../../edition/edition.service'
import { BullMqService } from '../../bull-mq/bull-mq.service'
import { Auth0Service } from '../../user/auth0.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { Nft } from '../../nft/schemas/nft.schema'
import { AvnTransactionApiSetupService } from '../../avn-transaction/services/avn-transaction-api-setup.service'
import { VaultService } from '../../vault/services/vault.service'
import { UserService } from '../../user/user.service'
import { UserMock, getMockUser } from '../../user/test/mocks'
import { User } from '../../user/schemas/user.schema'
import config from '../../config/app.config'
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

describe('PaymentService', () => {
  let service: PaymentService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken(Bid.name),
          useValue: getAvnTransaction()
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: getMockNftHistory()
        },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        ListingService,
        EditionListingService,
        AvnTransactionService,
        {
          provide: RedisService,
          useValue: {}
        },
        AvnTransactionApiSetupService,
        AvnTransactionApiGatewayService,
        StripeService,
        ConfigService,
        HttpService,
        {
          provide: 'AXIOS_INSTANCE_TOKEN',
          useFactory: mockAxios
        },
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: new UserMock(getMockUser())
        },
        VaultService,
        UserService,
        EditionService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        Auth0Service,
        EmailService
      ],
      imports: [ConfigModule.forRoot({ load: [config] })]
    }).compile()

    service = module.get<PaymentService>(PaymentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
