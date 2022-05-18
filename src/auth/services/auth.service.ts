import { Injectable } from '@nestjs/common'
import { JwtPayload } from '../jwt.strategy'
import { Provider, User } from '../../user/schemas/user.schema'
import { UserService } from '../../user/user.service'

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async validateUser(payload: JwtPayload): Promise<User> {
    const [provider, id] = payload.sub.split('|')

    let user = await this.userService.findOneByProvider(
      id,
      provider as Provider
    )

    if (!user) {
      user = await this.userService.createUser({
        provider: {
          name: provider as Provider,
          id
        }
      })
    }

    return user
  }
}
