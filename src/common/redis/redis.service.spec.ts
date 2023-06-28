import { Test, TestingModule } from '@nestjs/testing'
import { RedisService } from './redis.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from '../../config/app.config'

describe('RedisService', () => {
  let service: RedisService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService, ConfigService],
      imports: [ConfigModule.forRoot({ load: [config] })]
    }).compile()

    service = module.get<RedisService>(RedisService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
