import { AvnTransactionHttpController } from './controllers/avn-transaction.http-controller'
import { AvnTransactionApiGatewayService } from './services/avn-transaction-api-gateway.service'
import { AvnTransactionService } from './services/avn-transaction.service'
import { AvnTransactionApiSetupService } from './services/avn-transaction-api-setup.service'
import { VaultService } from '../vault/services/vault.service'
import { MongooseModule } from '@nestjs/mongoose'
import {
  AvnNftTransaction,
  AvnNftTransactionSchema
} from './schemas/avn-transaction.schema'
import { DbCollections } from '../shared/enum'
import { LogModule } from '../log/log.module'
import { Module, forwardRef } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { getRedisOptions } from '../utils/get-redis-options'
import { HttpModule } from '@nestjs/axios'
import { Auction, AuctionSchema } from '../listing/schemas/auction.schema'
import { BullMqModule } from '../bull-mq/bull-mq.module'
import { ListingModule } from '../listing/listing.module'
import { EditionModule } from '../edition/edition.module'
import { CommonModule } from '../common/common.module'
import { UserModule } from '../user/user.module'
import { RedisService } from '../common/redis/redis.service'

@Module({
  imports: [
    LogModule,
    EditionModule,
    CommonModule,
    forwardRef(() => ListingModule),
    MongooseModule.forFeature([
      {
        name: AvnNftTransaction.name,
        schema: AvnNftTransactionSchema,
        collection: DbCollections.AvnTransactions
      },
      {
        name: Auction.name,
        schema: AuctionSchema,
        collection: DbCollections.Auctions
      }
    ]),
    HttpModule,
    BullMqModule,
    UserModule
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
    AvnTransactionApiGatewayService,
    AvnTransactionService,
    AvnTransactionApiSetupService,
    VaultService,
    RedisService
  ],
  controllers: [AvnTransactionHttpController],
  exports: [
    AvnTransactionService,
    AvnTransactionApiGatewayService,
    AvnTransactionApiSetupService
  ]
})
export class AvnTransactionModule {}
