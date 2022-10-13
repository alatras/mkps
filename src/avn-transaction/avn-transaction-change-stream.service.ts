import {
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ChangeStreamOptions, ChangeStream } from 'mongodb'
import { Model } from 'mongoose'
import { LogService } from 'src/log/log.service'
import { AvnTransactionState, AvnTransactionType } from 'src/shared/enum'
import { AvnTransaction } from './schemas/avn-transaction.schema'

@Injectable()
export class AvnTransactionChangeStreamService
  implements OnModuleInit, OnModuleDestroy
{
  private log: LoggerService
  private pipeline: Array<Record<string, unknown>>
  private options: ChangeStreamOptions
  private resumeToken: object
  private changeStream: ChangeStream

  constructor(
    @InjectModel(AvnTransaction.name)
    private avnTransactionModel: Model<AvnTransaction>,
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
      this.options
    )

    try {
      while (await this.changeStream.hasNext()) {
        const data = await this.changeStream.next()
        this.resumeToken = data?._id
        this.handleChanges(data.fullDocument as AvnTransaction)
      }
    } catch (error) {
      if (this.changeStream.closed) {
        this.log.warn(
          'AvnTransactionChangeStreamService - Change Stream' +
            ` is closed with error: ${error.message}. Opening again...`
        )
        this.listen()
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
        this.log.debug(`${logString} is successfully MINTED in AVN`)
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
  onModuleInit() {
    this.listen()
  }

  /**
   * Gracefully closes the stream on shut down
   */
  async onModuleDestroy() {
    await this.changeStream.close()
  }
}
