import { Controller } from '@nestjs/common'
import { UserService } from '../user.service'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import * as MUUID from 'uuid-mongodb'
import { User } from '../schemas/user.schema'

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
}
