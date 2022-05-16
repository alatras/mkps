import { ExecutionContext, Injectable, Optional } from '@nestjs/common'
import { AuthGuard, AuthModuleOptions } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { JWT_OPTIONAL_META_KEY } from './decorators/jwt-optional.decorator'
import { Observable } from 'rxjs'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Optional() protected readonly options?: AuthModuleOptions
  ) {
    super(options)
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isJwtOptional =
      this.reflector.get<boolean>(
        JWT_OPTIONAL_META_KEY,
        context.getHandler()
      ) ||
      this.reflector.get<boolean>(JWT_OPTIONAL_META_KEY, context.getClass())

    if (isJwtOptional) {
      return true
    }

    return super.canActivate(context)
  }
}
