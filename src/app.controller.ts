import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
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
