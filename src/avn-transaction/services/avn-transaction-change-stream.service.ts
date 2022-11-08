import {
  Inject,
  Injectable,
  InternalServerErrorException,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ChangeStream, ChangeStreamOptions } from 'mongodb'
import { Model } from 'mongoose'
import {
  AvnMintBatchHistory,
  AvnNftTransaction,
  AvnEditionTransaction
} from '../schemas/avn-transaction.schema'
import { LogService } from '../../log/log.service'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { ClientProxy } from '@nestjs/microservices'

@Injectable()
export class AvnTransactionChangeStreamService
  implements OnModuleInit, OnModuleDestroy
{
  private log: LoggerService
  private options: ChangeStreamOptions
  private changeStream: ChangeStream
  private pipeline: Array<Record<string, unknown>>

  constructor(
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    private logService: LogService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.log = this.logService.getLogger()
    this.options = { fullDocument: 'updateLookup' }
    this.pipeline = [{ $match: { operationType: 'update' } }]
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
   * Listens to changeStream for minting single NFT and sends data to handler.
   * This listener is constant and will not close.
   */
  private async listen(): Promise<void> {
    this.changeStream = this.avnTransactionModel.watch(
      this.pipeline,
      this.options
    )

    try {
      while (await this.changeStream.hasNext()) {
        const data = await this.changeStream.next()
        this.handleChangeStreamChanges(data.fullDocument as AvnNftTransaction)
      }
    } catch (error) {
      if (this.changeStream.closed) {
        this.log.error(
          '[AvnTransactionChangeStreamService] changeStream' +
            ` is closed with error: ${error.message}. Opening again...`
        )
        this.listen()
      } else {
        this.log.error('[listen] failed: ' + error)
        throw new InternalServerErrorException(error.message)
      }
    }
  }

  /**
   * Handles changes coming from stream for minting NFT
   */
  private async handleChangeStreamChanges(
    transaction: AvnNftTransaction | AvnEditionTransaction
  ): Promise<void> {
    const state = transaction.state
    const logString =
      '[handleChangeStreamChanges] AVN trx on NFT id ' +
      `${transaction.data['unique_external_ref']} type ${transaction.type}`

    switch (state) {
      case AvnTransactionState.PROCESSING_COMPLETE:
        switch (transaction.type) {
          case AvnTransactionType.MintSingleNft:
            this.handleMintingNft(transaction as AvnNftTransaction)
            break

          case AvnTransactionType.AvnCreateBatch:
            this.handleMintingEdition(transaction as AvnEditionTransaction)
            break

          default:
            this.log.warn(`${logString} has MISSING HANDLER`)
        }
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
   * Handles minting Edition update based on change stream
   */
  private async handleMintingEdition(transaction: AvnEditionTransaction) {
    const editionId = transaction?.request_id?.split(':')[1]

    const logString =
      '[handleMintingEdition] AVN trx to mint Edition ID ' +
      `${editionId}, type ${transaction.type}`

    const history = transaction.history.find(
      history => history.state === AvnTransactionState.PROCESSING_COMPLETE
    ) as unknown as AvnMintBatchHistory

    const batchId = history?.operation_data?.batchId

    if (!history || !batchId) {
      this.log.error(
        `${logString} failed to updated Edition ID ` +
          editionId +
          ' although state is PROCESSING_COMPLETE because a key is missing: ' +
          `history ${history} batch Id ${batchId}`
      )
      return
    }

    this.log.log(`${logString} is successfully MINTED in AVN`)

    this.clientProxy.emit(
      MessagePatternGenerator('edition', 'handleEditionMinted'),
      {
        editionId,
        batchId
      }
    )
  }

  /**
   * Handles minting NFt update based on change stream
   */
  private async handleMintingNft(transaction: AvnNftTransaction) {
    const logString =
      '[handleMintingNft] AVN trx on NFT id ' +
      `${transaction.data['unique_external_ref']} type ${transaction.type}`

    const nftId = transaction.data['unique_external_ref']
    const eid =
      transaction.history[transaction.history.length - 1]?.operation_data[
        'nftId'
      ]

    if (nftId === undefined || eid === undefined) {
      this.log.error(
        `${logString} failed to updated NFT ` +
          'although state is "PROCESSING_COMPLETE" ' +
          'because a key is missing. ' +
          `Request id: ${transaction.request_id}, ` +
          `nftId: ${nftId}, ` +
          `eid: ${eid}.`
      )
      return
    }

    this.log.log(`${logString} is successfully MINTED in AVN`)

    this.clientProxy.emit(MessagePatternGenerator('nft', 'handleNftMinted'), {
      nftId,
      eid
    })
  }
}
