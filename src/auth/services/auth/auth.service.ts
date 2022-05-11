import { Injectable } from '@nestjs/common'
import { JwtPayload } from '../../jwt.strategy'
import { Provider, User } from '../../../user/schemas/user.schema'
import { UserService } from '../../../user/user.service'

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async validateUser(payload: JwtPayload): Promise<User> {
    const [provider, id] = payload.sub.split('|')

    const user = await this.userService.findOneByProvider(
      id,
      provider as Provider
    )

    if (!user) {
      return await this.userService.createUser({
        name: provider as Provider,
        id
      })
    }

    return user
  }
}
