import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './schemas/user.schema'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { DbCollections } from '../shared/enum'
import { ConfigModule } from '@nestjs/config'
import { LogModule } from 'src/log/log.module'

@Module({
  imports: [
    LogModule,
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
        collection: DbCollections.Users
      }
    ])
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
