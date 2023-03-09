import { Logger, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MongooseModule } from '@nestjs/mongoose'
import { getMongoUri } from '../utils/database'
import { ConfigModule, ConfigService } from '@nestjs/config'
import config from './config/app.config'
import { AuthModule } from './auth/auth.module'
import { LogModule } from './log/log.module'
import { getActiveMicroservices } from '../utils/microservices'
import { UserModule } from './user/user.module'
import { EditionListingModule } from './edition-listing/edition-listing.module'
import { AssetModule } from './asset/asset.module'
import { PaymentModule } from './payment/payment.module'
import { ListingModule } from './listing/listing.module'
import { VaultModule } from './vault/vault.module'

const GENERAL_IMPORTS = [
  AuthModule,
  LogModule,
  ConfigModule.forRoot({ load: [config], isGlobal: true }),
  MongooseModule.forRootAsync({
    useFactory: () => {
      return {
        uri: getMongoUri(),
        dbName: new ConfigService().get<string>('MONGODB_NAME')
      }
    }
  })
]

// TODO: remove UserModule, EditionListingModule and AssetModule when they're ready to be completely separated
const imports = [
  ...GENERAL_IMPORTS,
  UserModule,
  EditionListingModule,
  AssetModule,
  PaymentModule,
  ListingModule,
  VaultModule,
  ...getActiveMicroservices()
]

@Module({
  imports,
  controllers: [AppController],
  providers: [AppService, Logger]
})
export class AppModule {}
