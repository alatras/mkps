import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ChangeStream, ChangeStreamOptions } from 'mongodb'
import { Model } from 'mongoose'
import { AvnTransaction } from '../schemas/avn-transaction.schema'
import { LogService } from '../../log/log.service'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { ClientProxy } from '@nestjs/microservices'

@Injectable()
export class AvnTransactionChangeStreamService
  implements OnModuleInit, OnModuleDestroy
{
  private log: LoggerService
  private pipeline: Array<Record<string, unknown>>
  private options: ChangeStreamOptions
  private resumeToken: unknown
  private changeStream: ChangeStream

  constructor(
    @InjectModel(AvnTransaction.name)
    private avnTransactionModel: Model<AvnTransaction>,
    private logService: LogService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
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
      resumeAfter: this.resumeToken || undefined
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
        this.log.error(
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
        if (transaction.type === AvnTransactionType.MintSingleNft) {
          this.log.log(`${logString} is successfully MINTED in AVN`)

          return await this.sendMintingSuccessfulEvent(transaction)
        }

        this.log.warn(`${logString} MISSING HANDLER`)

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

  async sendMintingSuccessfulEvent(transaction: AvnTransaction): Promise<void> {
    const nftId = transaction.data?.unique_external_ref
    const eid =
      transaction.history[transaction.history.length - 1]?.operation_data?.nftId

    if (nftId === undefined || eid === undefined) {
      this.log.error(
        '[sendMintingSuccessfulEvent] failed to updated NFT ' +
          'although AVN transaction state is "PROCESSING_COMPLETE" ' +
          'because a key is missing. ' +
          `Request id: ${transaction.request_id}, ` +
          `nftId: ${nftId}, ` +
          `eid: ${eid}.`
      )
      return
    }

    this.clientProxy.emit(MessagePatternGenerator('nft', 'handleNftMinted'), {
      nftId,
      eid
    })
  }
}
