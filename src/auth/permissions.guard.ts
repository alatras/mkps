import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { Reflector } from '@nestjs/core'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const routePermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    )

    const userPermissions = context.getArgByIndex(0).user.permissions

    const hasAllRequiredPermissions = routePermissions.every(routePermission =>
      userPermissions.includes(routePermission)
    )

    if (
      !routePermissions ||
      routePermissions.length === 0 ||
      hasAllRequiredPermissions
    ) {
      return true
    }

    throw new ForbiddenException('Insufficient Permissions')
  }
}
