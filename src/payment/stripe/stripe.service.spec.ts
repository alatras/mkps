import { Test, TestingModule } from '@nestjs/testing'
import { StripeService } from './stripe.service'
import { Auth0Service } from '../../user/auth0.service'
import { ListingService } from '../../listing/listing.service'

describe('StripeService', () => {
  let service: StripeService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: Auth0Service,
          useValue: {}
        },
        {
          provide: ListingService,
          useValue: {}
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useValue: {}
        }
      ]
    }).compile()

    service = module.get<StripeService>(StripeService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
