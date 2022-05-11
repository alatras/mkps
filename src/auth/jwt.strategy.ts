import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Injectable } from '@nestjs/common'
import { passportJwtSecret } from 'jwks-rsa'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './services/auth/auth.service'

export interface JwtPayload {
  iss: string
  sub: string
  aud: string[]
  iat: number
  exp: number
  azp: string
  scope: string
  permissions: string[]
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private authService: AuthService) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${configService.get<string>(
          'app.auth0.domain'
        )}.well-known/jwks.json`,
      }),

      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: configService.get<string>('app.auth0.audience'),
      issuer: configService.get<string>('app.auth0.domain'),
      algorithms: ['RS256']
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload)

    return {
      uuid: user._id,
      stripeCustomerId: user.stripeCustomerId,
      stripeAccountId: user.stripeAccountId,
      provider: user.provider,
      ethAddresses: user.ethAddresses,
      permissions: payload.permissions
    }
  }
}
