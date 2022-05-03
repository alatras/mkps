import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { getMongoUri } from "../utils/database";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return getMongoUri()
    // return this.appService.getHello();
  }
}
