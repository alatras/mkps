import { Test, TestingModule } from '@nestjs/testing'
import { PaymentController } from './payment.controller'
import { PaymentService } from '../services/payment.service'
import { ListingService } from '../../listing/listing.service'
import { StripeService } from '../stripe/stripe.service'
import { getModelToken } from '@nestjs/mongoose'
import { Bid } from '../schemas/bid.dto'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { Auction } from '../../listing/schemas/auction.schema'
import { ConfigService } from '@nestjs/config'
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

describe('PaymentController', () => {
  let controller: PaymentController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        EmailService,
        ListingService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        ConfigService,
        Auth0Service,
        StripeService,
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

    controller = module.get<PaymentController>(PaymentController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
