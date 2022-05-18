import {
  Controller,
  Get,
  Request,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { UserService } from './user.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { Request as ExpressRequest } from 'express'
import { UserResponseDto } from './dto/user.dto'
import MongooseClassSerializerInterceptor from '../interceptors/mongoose-class-serializer.interceptor'
import { User } from './schemas/user.schema'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(MongooseClassSerializerInterceptor(UserResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('read:nfts')
  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userService.findAll()

    return users.map(user => new UserResponseDto(user))
  }

  @UseInterceptors(MongooseClassSerializerInterceptor(UserResponseDto))
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getLoggedInUser(
    @Request() req: ExpressRequest
  ): Promise<UserResponseDto> {
    const user = await this.userService.findOneByProvider(
      (req.user as User).provider.id,
      (req.user as User).provider.name
    )

    return new UserResponseDto(user)
  }
}
