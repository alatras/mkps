import { Controller } from '@nestjs/common'
import { UserService } from '../user.service'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import * as MUUID from 'uuid-mongodb'
import { Provider, User } from '../schemas/user.schema'
import { CreateUserDto } from '../dto/user.dto'

@Controller('users')
export class UserMsController {
  private mUUID: any

  constructor(private readonly userService: UserService) {
    this.mUUID = MUUID.mode('relaxed')
  }

  @Permissions('read:users')
  @MessagePattern(MessagePatternGenerator('user', 'getUserById'))
  async getUserById(@Payload('userId') userId: string): Promise<User> {
    return await this.userService.findOneById(this.mUUID.from(userId))
  }

  @Permissions('read:users')
  @MessagePattern(MessagePatternGenerator('user', 'getUserByProvider'))
  async getUserByProvider(
    @Payload('providerId') providerId: string,
    @Payload('providerName') providerName: Provider
  ): Promise<User> {
    return await this.userService.findOneByProvider(providerId, providerName)
  }

  /**
   * Get user by Customer ID
   * @param customerId Customer ID
   * @returns User
   */
  @Permissions('read:users')
  @MessagePattern(MessagePatternGenerator('user', 'getUserByStripeCustomerId'))
  async getUserByCustomerId(
    @Payload() payload: { stripeCustomerId: string }
  ): Promise<User> {
    return await this.userService.findOneByStripeCustomerId(
      payload.stripeCustomerId
    )
  }

  @Permissions('read:users, write:users')
  @MessagePattern(MessagePatternGenerator('user', 'updateUserById'))
  async updateUserById(
    @Payload() payload: { userId: string; data: Record<string, any> }
  ): Promise<User> {
    return await this.userService.updateUserById(
      this.mUUID.from(payload.userId),
      payload.data
    )
  }

  @Permissions('read:users, write:users')
  @MessagePattern(MessagePatternGenerator('user', 'createUser'))
  async createUser(@Payload() payload: { data: CreateUserDto }): Promise<User> {
    return await this.userService.createUser(payload.data)
  }

  // implement deleteUserById
  @Permissions('read:users, write:users')
  @MessagePattern(MessagePatternGenerator('user', 'deleteUserById'))
  async deleteUserById(@Payload() payload: { userId: string }): Promise<User> {
    return await this.userService.deleteUserById(
      this.mUUID.from(payload.userId)
    )
  }
}
