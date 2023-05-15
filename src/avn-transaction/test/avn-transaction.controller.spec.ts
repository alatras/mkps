import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../../user/schemas/user.schema'
import { getMockUser } from '../../user/test/mocks'
import { getQueueToken } from '@nestjs/bull'
import { NftService } from '../../nft/services/nft.service'
import { UserService } from '../../user/user.service'
import { AvnTransactionHttpController } from '../controllers/avn-transaction.http-controller'
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
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'
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

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('AvnTransactionController', () => {
  let controller: AvnTransactionHttpController

  const mockQueue = {
    add: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        Auth0Service,
        StripeService,
        LogService,
        AvnTransactionService,
        AvnTransactionApiGatewayService,
        UserService,
        NftService,
        EditionService,
        EditionListingService,
        PaymentService,
        S3Service,
        EmailService,
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
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        {
          provide: getModelToken(Bid.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: getMockNftHistory()
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ],
      imports: [ConfigModule.forRoot({ load: [config] })],
      controllers: [AvnTransactionHttpController]
    }).compile()

    controller = module.get<AvnTransactionHttpController>(
      AvnTransactionHttpController
    )
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
