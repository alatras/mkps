import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { LogService } from '../../log/log.service'
import { UserService } from '../user.service'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { Request as ExpressRequest } from 'express'
import { UpdateAuth0Dto, UpdateUserDto, UserResponseDto } from '../dto/user.dto'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { Provider, User } from '../schemas/user.schema'
import { ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('users')
@Controller('users')
export class UserHttpController {
  private log: LoggerService

  constructor(
    private readonly userService: UserService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @UseInterceptors(MongooseClassSerializerInterceptor(UserResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('read:nfts')
  @ApiResponse({ type: [User] })
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

  @UseInterceptors(MongooseClassSerializerInterceptor(UserResponseDto))
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    type: UserResponseDto,
    status: 201,
    description: 'The record has been successfully updated.'
  })
  @Patch('me')
  async updateUser(
    @Request() req: ExpressRequest,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateUser(
      (req.user as User).provider.id,
      (req.user as User).provider.name,
      dto
    )

    return new UserResponseDto(user)
  }

  @UseInterceptors(MongooseClassSerializerInterceptor(UserResponseDto))
  @UseGuards(JwtAuthGuard)
  @Patch('auth0-email')
  async updateAuth0Email(
    @Request() req: ExpressRequest,
    @Body() dto: UpdateAuth0Dto
  ): Promise<UserResponseDto> {
    try {
      const providerName = (req.user as User).provider.name
      if (providerName !== Provider.auth0) {
        throw new UnauthorizedException('Invalid provider')
      }

      const user: User = (req as any).user

      const updated = await this.userService.updateAuth0Email(
        (req.user as User).provider.id,
        providerName,
        user,
        dto.email
      )

      return new UserResponseDto(updated)
    } catch (err) {
      this.log.error(
        `UserController - cannot update Auth0 email" ` + dto.email,
        err
      )
      switch (err.status) {
        case 404:
          throw new NotFoundException(err.message)
        case 400:
          throw new BadRequestException(err.message)
        case 500:
          throw new InternalServerErrorException(err.message)
        default:
          throw new InternalServerErrorException(err.message)
      }
    }
  }
}
