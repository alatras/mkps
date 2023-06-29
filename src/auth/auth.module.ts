import { PassportModule } from '@nestjs/passport'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { UserModule } from '../user/user.module'
import { AuthService } from './services/auth.service'
import { VaultService } from '../vault/services/vault.service'
import { AvnTransactionApiSetupService } from '../avn-transaction/services/avn-transaction-api-setup.service'
import { RedisService } from '../common/redis/redis.service'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [
    HttpModule,
    UserModule,
    CommonModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  providers: [
    JwtStrategy,
    AuthService,
    VaultService,
    AvnTransactionApiSetupService,
    RedisService
  ]
})
export class AuthModule {}
