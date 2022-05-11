import {
  Controller,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common'
import { UserService } from './user.service'
import { User } from './schemas/user.schema'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Permissions } from '../auth/permissions.decorator'
import { Request as ExpressRequest } from 'express'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('read:nfts')
  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getLoggedInUser(@Request() req: ExpressRequest): Promise<Express.User> {
    return req.user
  }
}
