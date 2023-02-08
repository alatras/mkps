import { Injectable } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { LogService } from '../../log/log.service'
import { AvnNftTransaction } from '../schemas/avn-transaction.schema'
import {
  AvnTransactionState,
  PollingTransactionStatus
} from '../../shared/enum'
import { AvnApi, AvnPolState } from '../schemas/avn-api'

@Injectable()
export class AvnTransactionApiGatewayService {
  private log: LoggerService
  private avnApi: AvnApi

  constructor(
    private configService: ConfigService,
    private logService: LogService,
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>
  ) {
    this.configService = configService
    this.log = this.logService.getLogger()
    this.initTheApi()
  }

  /**
   * Mint a single NFT with API Gateway
   * @param nftId NFT ID
   * @param localRequestId request ID returned to this BE consumer
   */
  async mintSingleNft(nftId: string, localRequestId: string): Promise<void> {
    try {
      const avnRelayer = this.configService.get<string>('app.avn.relayer')
      const externalRef = this.createExternalRef(nftId)
      const royalties = []
      const avnAuthority = this.configService.get<string>(
        'app.avn.avnAuthority'
      )

      const mintResult = await this.avnApi.send.mintSingleNft(
        avnRelayer,
        externalRef,
        royalties,
        avnAuthority
      )

      this.log.debug(
        `[AvnTransactionApiGatewayService] Mint NFT result from API Gateway: ${mintResult}`
      )

      this.getConfirmation(mintResult, localRequestId)
    } catch (e) {
      this.log.error(
        `[AvnTransactionApiGatewayService] Error minting NFT via API Gateway: ${nftId}`
      )
      throw e
    }
  }

  /**
   * Create external reference for NFT to be used in the blockchain
   * @param nftId NFT ID
   */
  createExternalRef(nftId: string): string {
    const tenantName = this.configService.get<string>('app.tenantName')
    const environment = this.configService.get<string>('app.environment')
    const externalRefVersion = this.configService.get<string>(
      'app.avn.externalRefVersion'
    )
    return `${externalRefVersion}:${tenantName}:${environment}:${nftId}`
  }

  /**
   * Get and store confirmation on AVN transaction by polling the result from API Gateway
   * @param avnRequestId Request ID returned by API Gateway
   * @param localRequestId request ID returned to this BE consumer
   */
  private async getConfirmation(
    avnRequestId: string,
    localRequestId: string
  ): Promise<void> {
    const avnPollingInterval: number =
      this.configService.get<number>('app.avn.pollingInterval') || 5000 // 5 seconds
    const avnPollingTimeout: number =
      this.configService.get<number>('app.avn.avnPollingTimeout') || 180000 // 3 minutes
    const loops: number = Math.floor(avnPollingTimeout / avnPollingInterval)

    let transactionCommitted = false
    let polledState: AvnPolState = null

    // Polling
    for (let i = 0; i < loops; i++) {
      await new Promise(resolve => setTimeout(resolve, avnPollingInterval))
      polledState = await this.avnApi.poll.requestState(avnRequestId)

      this.log.debug(
        `[AvnTransactionApiGatewayService] Polling transaction status: ${polledState.status}`
      )

      if (this.transactionIsCommitted(polledState)) {
        this.log.log(
          `[AvnTransactionApiGatewayService] Transaction of local request ID ${localRequestId}, ` +
            `AVN request ID ${avnRequestId}, is committed with status ${polledState.status}`
        )
        transactionCommitted = true
        break
      }
    }

    this.updateTransactionHistory(localRequestId, polledState)

    if (!transactionCommitted) {
      this.log.error(
        `[AvnTransactionApiGatewayService] Transaction of request ID ${localRequestId}, ` +
          `AVN request ID ${avnRequestId}, has timed out with status: ${polledState.status}`
      )
    }
  }

  /**
   * Check if transaction is committed
   * @param polledState Polled state
   * @returns boolean
   */
  private transactionIsCommitted(polledState: AvnPolState): boolean {
    return (
      polledState.status === PollingTransactionStatus.processed ||
      polledState.status === PollingTransactionStatus.rejected
    )
  }

  /**
   * Initialize API Gateway instance
   */
  private async initTheApi(): Promise<void> {
    /* eslint @typescript-eslint/no-var-requires: "off" */
    const AvnApi = require('avn-api')
    const avnGatewayUrl = this.configService.get<string>('app.avn.gatewayUrl')
    const suri = this.configService.get<string>('app.avn.suri')
    const options = { suri }

    const API = new AvnApi(avnGatewayUrl, options)
    await API.init()

    this.avnApi = API
  }

  /**
   * Update API transaction history
   * @param localRequestId request ID returned to this BE consumer
   * @param polledState Polled state
   */
  private async updateTransactionHistory(
    localRequestId: string,
    polledState: AvnPolState
  ): Promise<void> {
    let state: AvnTransactionState
    switch (polledState.status) {
      case PollingTransactionStatus.processed:
        state = AvnTransactionState.PROCESSING_COMPLETE
        break
      case PollingTransactionStatus.rejected:
        state = AvnTransactionState.AVN_REJECTED
        break
      default:
        state = AvnTransactionState.PROCESSING_FAILED
    }

    await this.avnTransactionModel.updateOne(
      { request_id: localRequestId },
      {
        $set: { state: state },
        $push: {
          history: {
            state: state,
            txHash: polledState.txHash,
            blockNumber: polledState.blockNumber,
            transactionIndex: polledState.transactionIndex,
            timestamp: new Date().toISOString()
          }
        }
      }
    )
  }
}
