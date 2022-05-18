import { Controller, Get, Logger } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  private readonly logger = new Logger(AppService.name)

  constructor(private readonly appService: AppService) {}

  @Get()
  getVersion() {
    return {
      app: 'Marketplace API',
      message: 'App Running',
      version: this.appService.getVersion()
    }
  }
}
