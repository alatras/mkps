import { Logger, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MongooseModule } from '@nestjs/mongoose'
import { getMongoString } from '../utils/database'
import { ConfigModule } from '@nestjs/config'
import config from './config/app.config'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { NftModule } from './nft/nft.module'
import { AvnTransactionModule } from './avn-transaction/avn-transaction.module'
import { EditionModule } from './edition/edition.module'
import { EditionListingModule } from './edition-listing/edition-listing.module'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    MongooseModule.forRoot(getMongoString()),
    AuthModule,
    UserModule,
    NftModule,
    AvnTransactionModule,
    EditionModule,
    EditionListingModule
  ],
  controllers: [AppController],
  providers: [AppService, Logger]
})
export class AppModule { }
