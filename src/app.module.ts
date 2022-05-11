import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MongooseModule } from '@nestjs/mongoose'
import { getMongoOptions } from '../utils/database'
import { ConfigModule } from '@nestjs/config'
import config from './config/app.config'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    MongooseModule.forRootAsync({ useFactory: () => getMongoOptions() }),
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
