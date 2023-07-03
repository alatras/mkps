import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  Logger
} from '@nestjs/common'
import { UserService } from '../user.service'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { Request as ExpressRequest } from 'express'
import { UpdateAuth0Dto, UpdateUserDto, UserResponseDto } from '../dto/user.dto'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { Provider, User } from '../schemas/user.schema'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'
import { DataWrapper } from '../../common/dataWrapper'

@ApiTags('users')
@Controller('users')
export class UserHttpController {
  private readonly logger = new Logger(UserHttpController.name)

  constructor(private readonly userService: UserService) {}

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
  ): Promise<DataWrapper<UserResponseDto>> {
    const user = await this.userService.findOneByProvider(
      (req.user as User).provider.id,
      (req.user as User).provider.name
    )

    const data = new UserResponseDto(user)

    return { data }
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
    try {
      const user = await this.userService.updateUserByProvider(
        (req.user as User).provider.id,
        (req.user as User).provider.name,
        dto
      )
      return new UserResponseDto(user)
    } catch (err) {
      this.logger.error(`cannot update user" ` + dto.email, err)
      errorResponseGenerator(err)
    }
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
      this.logger.error(`cannot update Auth0 email ` + dto.email, err)
      errorResponseGenerator(err)
    }
  }
}
