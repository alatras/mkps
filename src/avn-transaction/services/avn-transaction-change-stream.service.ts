import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class AvnTransactionChangeStreamService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly options: ChangeStreamOptions
  private changeStream: ChangeStream
  private readonly pipeline: Array<Record<string, unknown>>
  private readonly logger = new Logger(AvnTransactionChangeStreamService.name)

  constructor(
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
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
    try {
      this.changeStream = await this.avnTransactionModel.watch(
        this.pipeline,
        this.options
      )
    } catch (err) {
      this.logger.error('Error initializing changeStream:', err)
      throw new InternalServerErrorException(err.message)
    }

    if (!this.changeStream) {
      this.logger.error('Failed to initialize changeStream.')
      throw new InternalServerErrorException(
        'Failed to initialize changeStream.'
      )
    }

    try {
      while (await this.changeStream.hasNext()) {
        const data = await this.changeStream.next()
        this.handleChangeStreamChanges(data.fullDocument as AvnNftTransaction)
      }
    } catch (error) {
      if (this.changeStream.closed) {
        this.logger.error(
          `changeStream closed with error: ${error.message}. Opening again...`
        )
        this.listen()
      } else {
        this.logger.error('listening failed: ' + error)
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
    const logString = `AVN trx on NFT id ${transaction.data['unique_external_ref']} type ${transaction.type}`

    switch (state) {
      case AvnTransactionState.PROCESSING_COMPLETE:
        switch (transaction.type) {
          case AvnTransactionType.MintSingleNft:
            this.handleMintingNft(transaction as AvnNftTransaction)
            break

          case AvnTransactionType.AvnCreateBatch:
            this.handleMintingEdition(transaction as AvnEditionTransaction)
            break

          case AvnTransactionType.AvnMintFiatBatchNft:
            this.handleMintFiatBatchNft(transaction as AvnEditionTransaction)
            break

          case AvnTransactionType.MintSingleNftApiGateway:
            this.logger.debug(`${logString} needs no handling`)
            break

          default:
            this.logger.warn(`${logString} has MISSING HANDLER`)
        }
        break
      case AvnTransactionState.PROCESSING_FAILED:
        this.logger.debug(`${logString} has FAILED in AVN`)
        break
      case AvnTransactionState.AVN_LOST:
        this.logger.debug(`${logString} is LOST in AVN`)
        break
      case AvnTransactionState.AVN_REJECTED:
        this.logger.debug(`${logString} is REJECTED in AVN`)
        break
      default:
        this.logger.debug(`${logString} is UNKNOWN in AVN`)
    }
  }

  /**
   * Handles minting Edition update based on change stream
   */
  private async handleMintingEdition(transaction: AvnEditionTransaction) {
    const editionId = transaction?.request_id?.split(':')[1]

    const logString =
      'AVN trx to mint Edition ID ' + `${editionId}, type ${transaction.type}`

    const history = transaction.history.find(
      history => history.state === AvnTransactionState.PROCESSING_COMPLETE
    ) as unknown as AvnMintBatchHistory

    const batchId = history?.operation_data?.batchId

    if (!history || !batchId) {
      this.logger.error(
        `${logString} failed to updated Edition ID ` +
          editionId +
          ' although state is PROCESSING_COMPLETE because a key is missing: ' +
          `history ${history} batch Id ${batchId}`
      )
      return
    }

    this.logger.log(`${logString} is successfully MINTED in AVN`)

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
      'AVN trx on NFT id ' +
      `${transaction.data['unique_external_ref']} type ${transaction.type}`

    const nftId = transaction.data['unique_external_ref']
    const eid =
      transaction.history[transaction.history.length - 1]?.operation_data[
        'nftId'
      ]

    if (nftId === undefined || eid === undefined) {
      this.logger.error(
        `${logString} failed to updated NFT ` +
          'although state is "PROCESSING_COMPLETE" ' +
          'because a key is missing. ' +
          `Request id: ${transaction.request_id}, ` +
          `nftId: ${nftId}, ` +
          `eid: ${eid}.`
      )
      return
    }

    this.logger.log(`${logString} is successfully MINTED in AVN`)

    this.clientProxy.emit(MessagePatternGenerator('nft', 'handleNftMinted'), {
      nftId,
      eid
    })
  }

  /**
   * Handles minting Edition NFT update based on change stream
   * @param transaction
   */
  private async handleMintFiatBatchNft(transaction: AvnEditionTransaction) {
    const logString =
      'AVN trx on NFT ID ' +
      `${transaction.data['unique_external_ref']} type ${transaction.type}`

    const nftId = transaction.data['unique_external_ref']

    const eid =
      transaction.history[transaction.history.length - 1]?.operation_data[
        'nftId'
      ]

    // Check if all keys are present
    if (nftId === undefined || eid === undefined) {
      this.logger.error(
        `${logString} failed to update fiat batch NFT ` +
          'although state is "PROCESSING_COMPLETE" ' +
          'because a key is missing. ' +
          `Request id: ${transaction.request_id}, ` +
          `nftId: ${nftId}, ` +
          `eid: ${eid}.`
      )
      return
    }

    this.logger.log(`${logString} is successfully MINTED in AVN`)

    // Call NFT handler to update NFT
    try {
      await firstValueFrom(
        this.clientProxy.send(
          MessagePatternGenerator('nft', 'handleMintFiatBatchNft'),
          {
            nftId,
            eid
          }
        )
      )
    } catch (err) {
      const message =
        `${logString} failed to update fiat batch NFT ` +
        'although state is "PROCESSING_COMPLETE" ' +
        'because the NFT handler "handleMintFiatBatchNft" failed with error: ' +
        `${JSON.stringify(err)}, `
      this.logger.error(`[handleMintFiatBatchNft] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }
}
