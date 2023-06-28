import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'
import { getQueueToken } from '@nestjs/bull'
import { getModelToken } from '@nestjs/mongoose'
import { NftService } from '../services/nft.service'
import { AssetType, Nft } from '../schemas/nft.schema'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../../avn-transaction/schemas/avn-transaction.schema'
import {
  getEditionListing,
  getMockNft,
  NftMock,
  getMockNftHistory,
  getNftEdition
} from './mocks'
import { NftHistory } from '../schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/services/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { NftStatus } from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { HistoryType } from '../../shared/enum'
import { LogService } from '../../log/log.service'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { CreateNftDto } from '../dto/nft.dto'
import { UserMock, getMockUser } from '../../user/test/mocks'
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
import { S3Service } from '../../common/s3/s3.service'
import { EmailService } from '../../common/email/email.service'
import { FixedPriceService } from '../../listing/fixed-price/fixed-price.service'
import { AvnTransactionApiSetupService } from '../../avn-transaction/services/avn-transaction-api-setup.service'
import { VaultService } from '../../vault/services/vault.service'
import { UserService } from '../../user/user.service'
import { HttpService } from '@nestjs/axios'
import { User } from '../../user/schemas/user.schema'
import { RedisService } from '../../common/redis/redis.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

jest.mock('../../utils/get-royalties', () => ({
  getNftRoyalties: jest.fn()
}))

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

describe('NftService', () => {
  let service: NftService

  const mockQueue = {
    add: jest.fn()
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NftService,
        StripeService,
        EditionService,
        {
          provide: RedisService,
          useValue: {}
        },
        EditionListingService,
        Auth0Service,
        AvnTransactionService,
        AvnTransactionApiGatewayService,
        AvnTransactionApiSetupService,
        ConfigService,
        LogService,
        S3Service,
        HttpService,
        {
          provide: 'AXIOS_INSTANCE_TOKEN',
          useFactory: mockAxios
        },
        EmailService,
        {
          provide: VaultService,
          useFactory: mockVaultService
        },
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: new UserMock(getMockUser())
        },
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
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
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
        {
          provide: getModelToken(Auction.name),
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

    service = module.get<NftService>(NftService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new NFT', async () => {
      const nftDto: CreateNftDto = {
        name: 'Test NFT 0000001',
        description: 'super test collection',
        image: {
          small: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          },
          large: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          },
          original: {
            url: 'string',
            key: 'string',
            type: AssetType.image
          }
        },
        assets: [
          {
            url: 'string',
            key: 'string',
            type: AssetType.video
          }
        ],
        unlockableContent: {
          preview: 'string',
          quantity: 1,
          details: 'string',
          claimedCount: 0
        },
        properties: {
          sport: 'Test NFT 0000001',
          collection: 'Test NFT 0000001',
          athlete: 'Test NFT 0000001',
          artist: 'Test NFT 0000001'
        }
      }

      try {
        const mintNft = jest
          .spyOn(AvnTransactionService.prototype as any, 'mintNft')
          .mockImplementationOnce(() => Promise.resolve({ request_id: '555' }))

        jest
          .spyOn(NftService.prototype as any, 'getUser')
          .mockImplementationOnce(() =>
            Promise.resolve({
              _id: '0c8564bc-a743-11ed-afa1-0242ac120002',
              avnPubKey:
                '0x32eedc9a3debfb48cd4a47bebcfd4a3a780e6c91d7a64fe373ffffbdf4ecfb42',
              username: 'testUsername'
            })
          )

        // Mock user
        const user = getMockUser()
        const res = await service.mint(user, nftDto)

        expect(mintNft).toHaveBeenCalled()

        expect(res).toHaveProperty('id')
        expect(res).toHaveProperty('requestId')
        expect(res.requestId).toBe('555')
      } catch (e) {
        throw e
      }
    })
  })

  describe('handleNftMinted', () => {
    it('should call the correct functions with the correct data', async () => {
      const mockNft: Nft = getMockNft()

      jest
        .spyOn(service, 'updateOneById')
        .mockImplementationOnce(() => Promise.resolve(getMockNft()))

      jest
        .spyOn(service, 'addHistory')
        .mockImplementationOnce(() => Promise.resolve(getMockNftHistory()))

      await service.handleNftMinted(
        uuidFrom(mockNft._id).toString(),
        mockNft.avnNftId
      )

      expect(service.updateOneById).toBeCalledWith(
        uuidFrom(mockNft._id).toString(),
        {
          avnNftId: mockNft.avnNftId,
          status: NftStatus.minted
        }
      )

      expect(service.updateOneById).toBeCalledWith(
        uuidFrom(mockNft._id).toString(),
        {
          avnNftId: mockNft.avnNftId,
          status: NftStatus.minted
        }
      )

      expect(service.addHistory).toBeCalledWith({
        nftId: uuidFrom(mockNft._id).toString(),
        userAddress: mockNft.owner.avnPubKey,
        type: HistoryType.minted
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
