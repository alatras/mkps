import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { PaymentService } from './payment.service'
import { ListingService } from '../../listing/listing.service'
import { getModelToken } from '@nestjs/mongoose'
import { StripeService } from '../stripe/stripe.service'
import { Bid } from '../schemas/bid.dto'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { Auction } from '../../listing/schemas/auction.schema'
import { Auth0Service } from '../../user/auth0.service'
import { EmailService } from '../../common/email/email.service'
import { BullMqService } from '../../bull-mq/bull-mq.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

const bullMqServiceMock = () => ({
  addToQueue: jest.fn(),
  addSendEmailJob: jest.fn()
})

describe('PaymentService', () => {
  let service: PaymentService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        ListingService,
        StripeService,
        ConfigService,
        EmailService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        Auth0Service,
        {
          provide: getModelToken(Bid.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Auction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        }
      ]
    }).compile()

    service = module.get<PaymentService>(PaymentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
