import { Logger, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MongooseModule } from '@nestjs/mongoose'
import { getMongoOptions } from '../utils/database'
import { ConfigModule } from '@nestjs/config'
import config from './config/app.config'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { NftModule } from './nft/nft.module'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    MongooseModule.forRootAsync({ useFactory: () => getMongoOptions() }),
    AuthModule,
    UserModule,
    NftModule
  ],
  controllers: [AppController],
  providers: [AppService, Logger]
})
export class AppModule {}
