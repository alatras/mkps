import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { AvnTransactionController } from './avn-transaction.controller'
import { AvnTransactionService } from './avn-transaction.service'
import { MongooseModule } from '@nestjs/mongoose'
import { AvnTransaction, AvnTransactionSchema } from './schemas/avn-transaction.schema'
import { DbCollections } from '../shared/enum'
import { NftModule } from '../nft/nft.module'

@Module({
  controllers: [AvnTransactionController],
  providers: [AvnTransactionService],
  imports: [
    NftModule,
    UserModule,
    MongooseModule.forFeature([
      {
        name: AvnTransaction.name,
        schema: AvnTransactionSchema,
        collection: DbCollections.AvnTransactions
      },
    ]),
  ]
})
export class AvnTransactionModule { }
