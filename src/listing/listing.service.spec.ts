import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { AvnNftTransaction } from '../avn-transaction/schemas/avn-transaction.schema'
import { getAvnTransaction } from '../avn-transaction/test/mocks'
import { ListingService } from './listing.service'
import { Auction } from './schemas/auction.schema'
import { LogService } from '../log/log.service'
import { Bid } from '../payment/schemas/bid.dto'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
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
          provide: getModelToken(Auction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Bid.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        }
      ]
    }).compile()

    service = module.get<ListingService>(ListingService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
