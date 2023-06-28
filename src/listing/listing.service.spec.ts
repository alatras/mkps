import { getModelToken } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
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
import { AvnTransactionApiSetupService } from '../avn-transaction/services/avn-transaction-api-setup.service'
import { VaultService } from '../vault/services/vault.service'
import { User } from '../user/schemas/user.schema'
import { UserMock, getMockUser } from '../user/test/mocks'
import { UserService } from '../user/user.service'
import { Auth0Service } from '../user/auth0.service'
import config from '../config/app.config'
import { RedisService } from '../common/redis/redis.service'

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

describe('ListingService', () => {
  let service: ListingService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        ConfigService,
        LogService,
        {
          provide: RedisService,
          useValue: {}
        },
        EmailService,
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
        EditionListingService,
        EditionService,
        Auth0Service,
        AvnTransactionApiSetupService,
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
      ],
      imports: [ConfigModule.forRoot({ load: [config] })]
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
