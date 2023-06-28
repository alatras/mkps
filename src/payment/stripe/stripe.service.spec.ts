import { Test, TestingModule } from '@nestjs/testing'
import { StripeService } from './stripe.service'
import { Auth0Service } from '../../user/auth0.service'
import { ListingService } from '../../listing/listing.service'
import { RedisService } from '../../common/redis/redis.service'
import { ConfigService } from '@nestjs/config'

describe('StripeService', () => {
  let service: StripeService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisService,
          useValue: {}
        },
        ConfigService,
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
