import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException
} from '@nestjs/common'
import { promisify } from 'util'
import { expressjwt } from 'express-jwt'
import { expressJwtSecret } from 'jwks-rsa'
import { ConfigService } from '@nestjs/config'
import { AuthGuard, AuthModuleOptions } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { ALLOW_ANONYMOUS_META_KEY } from './allow-anonymous.decorator'
import { Observable } from 'rxjs'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Optional() protected readonly options: AuthModuleOptions,
    private readonly reflector: Reflector
  ) {
    super(options)
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Handle anonymous access
    const isAnonymousAllowed =
      this.reflector.get<boolean>(
        ALLOW_ANONYMOUS_META_KEY,
        context.getHandler()
      ) ||
      this.reflector.get<boolean>(ALLOW_ANONYMOUS_META_KEY, context.getClass())
    if (isAnonymousAllowed) {
      return true
    }

    return super.canActivate(context)
  }
}
