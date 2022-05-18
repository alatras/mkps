import { Controller, Get, UsePipes } from '@nestjs/common'
import { AppService } from './app.service'
import { ErrorValidationPipe } from './pipes/error-validation.pipe'

@Controller()
@UsePipes(new ErrorValidationPipe())
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
