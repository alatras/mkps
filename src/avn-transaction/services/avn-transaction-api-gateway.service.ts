import { Injectable, Inject } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Model } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import { ClientProxy } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { LogService } from '../../log/log.service'
import { AvnNftTransaction } from '../schemas/avn-transaction.schema'
import {
  AvnTransactionState,
  PollingTransactionStatus
} from '../../shared/enum'
// import { Nft } from '../../../../schemas/nft.schema'
import { AvnApi, AvnPolState } from '../schemas/avn-api'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { NftStatus } from '../../shared/enum'

@Injectable()
export class AvnTransactionApiGatewayService {
  private log: LoggerService
  private avnApi: AvnApi

  constructor(
    private configService: ConfigService,
    private logService: LogService,
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
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

      this.getConfirmation(mintResult, localRequestId, nftId)
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
    localRequestId: string,
    nftId: string
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

      // Update NFT status
      this.updateNftStatus(nftId, polledState)

      // If transaction is committed stop polling
      if (this.transactionIsCommitted(polledState)) {
        transactionCommitted = true
        this.log.log(
          `[AvnTransactionApiGatewayService] Transaction of local request ID ${localRequestId}, ` +
            `AVN request ID ${avnRequestId}, is committed with status ${polledState.status}`
        )
        break
      }
    }

    // Update transaction history
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

  /**
   * Update NFT status to adapted status from API Gateway polling
   * @param nftId NFT ID
   * @param polledState Polled state
   */
  private updateNftStatus(nftId: string, avnPolState: AvnPolState): void {
    const nftStatus = this.getNftStatusFromPolledState(avnPolState)

    firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'setStatusToNft'), {
        nftId,
        nftStatus
      })
    )
  }

  /**
   * Get NFT status from polled state
   * @param polledState Polled state
   * @returns NFT status
   */
  getNftStatusFromPolledState(polledState: AvnPolState): NftStatus {
    let nftStatus: NftStatus
    switch (polledState.status) {
      case PollingTransactionStatus.pending:
        nftStatus = NftStatus.minting
        break
      case PollingTransactionStatus.processed:
        nftStatus = NftStatus.minted
        break
      case PollingTransactionStatus.rejected:
        nftStatus = NftStatus.draft
        break
      default:
        nftStatus = NftStatus.draft
    }

    return nftStatus
  }
}