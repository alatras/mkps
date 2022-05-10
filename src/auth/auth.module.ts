import { PassportModule } from '@nestjs/passport'
import { JwtStrategy } from './jwt.strategy'
import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { AuthService } from './services/auth/auth.service'

@Module({
  imports: [UserModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, AuthService]
})
export class AuthModule {}
