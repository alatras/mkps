import { Test, TestingModule } from '@nestjs/testing'
import { EmailService } from './email.service'
import { BullMqService } from '../../bull-mq/bull-mq.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

const bullMqServiceMock = () => ({
  addToQueue: jest.fn(),
  addSendEmailJob: jest.fn()
})

describe('EmailService', () => {
  let service: EmailService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: BullMqService, useFactory: bullMqServiceMock },
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        }
      ]
    }).compile()

    service = module.get<EmailService>(EmailService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
