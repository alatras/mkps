import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Injectable } from '@nestjs/common'
import { passportJwtSecret } from 'jwks-rsa'
import { AuthService } from './services/auth.service'

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
  constructor(private authService: AuthService) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${
          process.env.AUTH0_CANONICAL_DOMAIN ?? process.env.AUTH0_DOMAIN
        }/.well-known/jwks.json`
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${
        process.env.AUTH0_CANONICAL_DOMAIN ?? process.env.AUTH0_DOMAIN
      }/`,
      algorithms: ['RS256']
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload)

    return {
      _id: user._id,
      stripeCustomerId: user.stripeCustomerId,
      stripeAccountId: user.stripeAccountId,
      provider: user.provider,
      ethAddresses: user.ethAddresses,
      permissions: payload.permissions
    }
  }
}
