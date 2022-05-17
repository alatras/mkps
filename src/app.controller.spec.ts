import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { version as packageJsonVersion } from '../package.json'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, Logger]
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it('should return version', () => {
      expect(appController.getVersion()).toStrictEqual({
        app: 'Marketplace API',
        message: 'App Running',
        version: process.env.npm_package_version ?? packageJsonVersion
      })
    })
  })
})
