import { Test, TestingModule } from '@nestjs/testing'
import { FixedPriceService } from './fixed-price.service'
import { StripeService } from '../../payment/stripe/stripe.service'
import { ListingService } from '../listing.service'

describe('FixedPriceService', () => {
  let service: FixedPriceService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixedPriceService,
        {
          provide: StripeService,
          useValue: {}
        },
        {
          provide: ListingService,
          useValue: {}
        }
      ]
    }).compile()

    service = module.get<FixedPriceService>(FixedPriceService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
