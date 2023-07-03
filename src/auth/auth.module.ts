import { PassportModule } from '@nestjs/passport'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { UserModule } from '../user/user.module'
import { AuthService } from './services/auth.service'
import { VaultService } from '../vault/services/vault.service'
import { SplitFeeService } from '../user/split.fee.service'
import { AvnTransactionApiSetupService } from '../avn-transaction/services/avn-transaction-api-setup.service'
import { RedisService } from '../common/redis/redis.service'
import { CommonModule } from '../common/common.module'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'

@Module({
  imports: [
    HttpModule,
    UserModule,
    CommonModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  providers: [
    {
      provide: 'TRANSPORT_CLIENT',
      useFactory: (): ClientProxy & Closeable => {
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: getRedisOptions()
        })
      }
    },
    JwtStrategy,
    AuthService,
    VaultService,
    AvnTransactionApiSetupService,
    RedisService,
    SplitFeeService
  ]
})
export class AuthModule {}
