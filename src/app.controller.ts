import { Controller, Get, Logger } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: Logger
  ) {}

  @Get()
  getVersion() {
    return {
      app: 'Marketplace API',
      message: 'App Running',
      version: this.appService.getVersion()
    }
  }
}
