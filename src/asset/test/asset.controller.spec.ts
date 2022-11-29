import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { LogService } from '../../log/log.service'
import { AssetController } from '../controllers/asset.controller'
import { AssetService } from '../services/asset.service'

describe('AssetController', () => {
  let controller: AssetController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogService, ConfigService, AssetService],
      controllers: [AssetController]
    }).compile()

    controller = module.get<AssetController>(AssetController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
