import { Test, TestingModule } from '@nestjs/testing'
import { BullMqService, MAIN_BULL_QUEUE_NAME } from './bull-mq.service'
import { getQueueToken } from '@nestjs/bull'

describe('BullMqService', () => {
  let service: BullMqService

  const mockQueue = {
    add: jest.fn()
  }

  const bullMqServiceMock = () => ({
    addToQueue: jest.fn(),
    addSendEmailJob: jest.fn()
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: BullMqService, useFactory: bullMqServiceMock },
        {
          provide: getQueueToken(MAIN_BULL_QUEUE_NAME),
          useValue: mockQueue
        }
      ]
    }).compile()

    service = module.get<BullMqService>(BullMqService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
