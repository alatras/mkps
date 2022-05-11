import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AppService } from './app.service'
import { AuthorizationGuard } from './auth/authorization.guard'
import { PermissionsGuard } from './auth/permissions.guard'
import { Permissions } from './auth/permissions.decorator'
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @UseGuards(AuthorizationGuard, PermissionsGuard)
  @Post('test-token')
  @Permissions('write:nfts')
  postHello(): string {
    return 'Token authorized!'
  }
}
