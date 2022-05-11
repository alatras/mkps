import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { promisify } from 'util'
import { expressjwt } from 'express-jwt'
import { expressJwtSecret } from 'jwks-rsa'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly AUTH0_AUDIENCE: string
  private readonly AUTH0_DOMAIN: string

  constructor(private configService: ConfigService) {
    this.AUTH0_AUDIENCE = this.configService.get<string>('app.auth0.audience')
    this.AUTH0_DOMAIN = this.configService.get<string>('app.auth0.domain')
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.getArgByIndex(0)
    const res = context.getArgByIndex(1)

    const checkJwt = promisify(
      expressjwt({
        secret: expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${this.AUTH0_DOMAIN}.well-known/jwks.json`
        }),
        audience: this.AUTH0_AUDIENCE,
        requestProperty: 'user',
        issuer: this.AUTH0_DOMAIN,
        algorithms: ['RS256']
      })
    )

    try {
      await checkJwt(req, res)

      return true
    } catch (e) {
      throw new UnauthorizedException(e)
    }
  }
}
