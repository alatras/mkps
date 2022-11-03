import { Controller } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { LogService } from '../../log/log.service'
import { UserService } from '../user.service'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import * as MUUID from 'uuid-mongodb'

@Controller('users')
export class UserMsController {
  private mUUID: any
  private log: LoggerService

  constructor(
    private readonly userService: UserService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
    this.mUUID = MUUID.mode('relaxed')
  }

  @Permissions('read:nfts')
  @MessagePattern(MessagePatternGenerator('user', 'getUserById'))
  async getUserById(@Payload('userId') userId: string) {
    const user = await this.userService.findOneById(this.mUUID.from(userId))
    user._id = this.mUUID.from(user._id)
    return user
  }
}
