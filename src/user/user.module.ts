import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './schemas/user.schema'
import { UserService } from './user.service'
import { UserMsController } from './controllers/user.ms-controller'
import { UserHttpController } from './controllers/user.http-controller'
import { DbCollections } from '../shared/enum'
import { ConfigModule } from '@nestjs/config'
import { LogModule } from '../log/log.module'
import { Auth0Service } from './auth0.service'
import { SplitFeeService } from './split.fee.service'
import { HttpModule } from '@nestjs/axios'
import config from '../config/app.config'

@Module({
  imports: [
    LogModule,
    ConfigModule.forRoot({ load: [config] }),
    HttpModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
        collection: DbCollections.Users
      }
    ])
  ],
  providers: [UserService, Auth0Service, SplitFeeService],
  controllers: [UserHttpController, UserMsController],
  exports: [UserService]
})
export class UserModule {}
