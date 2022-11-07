import { Logger, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MongooseModule } from '@nestjs/mongoose'
import { getMongoUri } from '../utils/database'
import { ConfigModule } from '@nestjs/config'
import config from './config/app.config'
import { AuthModule } from './auth/auth.module'
import { LogModule } from './log/log.module'
import { getActiveMicroservices } from '../utils/microservices'

const GENERAL_IMPORTS = [
  AuthModule,
  LogModule,
  ConfigModule.forRoot({ load: [config], isGlobal: true }),
  MongooseModule.forRoot(getMongoUri())
]

const imports = [...GENERAL_IMPORTS, ...getActiveMicroservices()]




@Module({
  imports,
  controllers: [AppController],
  providers: [AppService, Logger]
})
export class AppModule {}
