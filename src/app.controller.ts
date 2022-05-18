import { Controller, Get, UsePipes, Logger } from '@nestjs/common'
import { AppService } from './app.service'
import { ErrorValidationPipe } from './pipes/error-validation.pipe'

@Controller()
@UsePipes(new ErrorValidationPipe())
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
