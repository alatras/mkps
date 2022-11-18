import { Controller } from '@nestjs/common'
import { LogService } from '../../log/log.service'
import { UserService } from '../user.service'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import * as MUUID from 'uuid-mongodb'
import { User } from '../schemas/user.schema'

@Controller('users')
export class UserMsController {
  private mUUID: any

  constructor(
    private readonly userService: UserService,
    private logService: LogService
  ) {
    this.mUUID = MUUID.mode('relaxed')
  }

  @Permissions('read:users')
  @MessagePattern(MessagePatternGenerator('user', 'getUserById'))
  async getUserById(@Payload('userId') userId: string) {
    const user: User = await this.userService.findOneById(
      this.mUUID.from(userId)
    )
    return user
  }
}
