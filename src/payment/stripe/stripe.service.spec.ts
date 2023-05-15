import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { StripeService } from './stripe.service'
import { Auth0Service } from '../../user/auth0.service'
import { ListingService } from '../../listing/listing.service'
import { Auction } from '../../listing/schemas/auction.schema'
import { getAvnTransaction } from '../../avn-transaction/test/mocks'
import { Bid } from '../schemas/bid.dto'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('StripeService', () => {
  let service: StripeService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        Auth0Service,
        ListingService,
        ConfigService,
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

    service = module.get<StripeService>(StripeService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
