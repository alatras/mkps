import {
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ChangeStream, ChangeStreamOptions } from 'mongodb'
import { Model } from 'mongoose'
import { AvnTransactionService } from './avn-transaction.service'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { LogService } from '../../log/log.service'
import { AvnTransaction } from '../schemas/avn-transaction.schema'
import { MUUID } from 'uuid-mongodb'

@Injectable()
export class AvnTransactionChangeStreamService
  implements OnModuleInit, OnModuleDestroy
{
  private log: LoggerService
  private pipeline: Array<Record<string, unknown>>
  private options: ChangeStreamOptions | unknown
  private resumeToken: object
  private changeStream: ChangeStream

  constructor(
    @InjectModel(AvnTransaction.name)
    private avnTransactionModel: Model<AvnTransaction>,
    private avnTransactionService: AvnTransactionService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
    this.pipeline = [
      {
        $match: {
          operationType: 'update',
          'fullDocument.type': AvnTransactionType.MintSingleNft
        }
      }
    ]
    this.options = {
      fullDocument: 'updateLookup',
      resumeAfter: this.resumeToken
    }
  }

  /**
   * Listens to change stream and sends data to handler
   */
  private async listen(): Promise<void> {
    this.changeStream = this.avnTransactionModel.watch(
      this.pipeline,
      this.options as any
    ) as unknown as ChangeStream<AvnTransaction>

    try {
      while (await this.changeStream.hasNext()) {
        const data = await this.changeStream.next()
        this.resumeToken = data._id

        await this.handleChanges(data.fullDocument as AvnTransaction)
      }
    } catch (error) {
      if (this.changeStream.close) {
        this.log.error(
          'AvnTransactionChangeStreamService - Change Stream' +
            ` is closed with error: ${error.message}. Opening again...`
        )
        await this.listen()
      } else {
        throw error
      }
    }
  }

  /**
   * Handles changes coming from stream
   */
  private async handleChanges(transaction: AvnTransaction): Promise<void> {
    const state = transaction.state
    const logString = `AVN trx on NFT id ${transaction.data.unique_external_ref} type ${transaction.type}`

    switch (state) {
      case AvnTransactionState.PROCESSING_COMPLETE:
        await this.avnTransactionService.handleAvnTransactionProcessingComplete(
          transaction
        )

        this.log.log(`${logString} is successfully MINTED in AVN`)
        break
      case AvnTransactionState.PROCESSING_FAILED:
        this.log.debug(`${logString} has FAILED in AVN`)
        break
      case AvnTransactionState.AVN_LOST:
        this.log.debug(`${logString} is LOST in AVN`)
        break
      case AvnTransactionState.AVN_REJECTED:
        this.log.debug(`${logString} is REJECTED in AVN`)
        break
      default:
        this.log.debug(`${logString} is UNKNOWN in AVN`)
    }
  }

  /**
   * Invokes listener after module initiation
   */
  async onModuleInit() {
    await this.listen()
  }

  /**
   * Gracefully closes the stream on shut down
   */
  async onModuleDestroy() {
    await this.changeStream.close()
  }
}
