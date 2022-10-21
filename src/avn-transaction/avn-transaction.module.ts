import { AvnTransactionHttpController } from './controllers/avn-transaction.http-controller'
import { AvnTransactionChangeStreamService } from './services/avn-transaction-change-stream.service'
import { AvnTransactionService } from './services/avn-transaction.service'
import { UserModule } from '../user/user.module'
import { MongooseModule } from '@nestjs/mongoose'
import {
  AvnTransaction,
  AvnTransactionSchema
} from './schemas/avn-transaction.schema'
import { DbCollections } from '../shared/enum'
import { NftModule } from '../nft/nft.module'
import { LogModule } from '../log/log.module'
import { Module } from '@nestjs/common'

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AvnTransaction.name,
        schema: AvnTransactionSchema,
        collection: DbCollections.AvnTransactions
      }
    ]),
    LogModule,
    NftModule,
    UserModule
  ],
  controllers: [AvnTransactionHttpController],
  providers: [AvnTransactionService, AvnTransactionChangeStreamService],
  exports: [AvnTransactionService]
})
export class AvnTransactionModule {}
