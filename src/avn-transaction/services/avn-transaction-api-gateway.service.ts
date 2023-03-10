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
  ApiGateWayPollingOption,
  AvnTransactionState,
  PollingTransactionStatus
} from '../../shared/enum'
import { AvnApi, AvnPolState } from '../schemas/avn-api'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { NftStatus } from '../../shared/enum'
import { Nft } from '../../nft/schemas/nft.schema'

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
        `[AvnTransactionApiGatewayService.mintSingleNft] Mint NFT result from API Gateway: ${mintResult}`
      )

      this.getConfirmation(
        mintResult,
        nftId,
        ApiGateWayPollingOption.mintSingleNft,
        localRequestId,
        externalRef
      )
    } catch (e) {
      this.log.error(
        `[AvnTransactionApiGatewayService.mintSingleNft] Error minting NFT via API Gateway: ${nftId}`
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
   * Get and store confirmations of AvN transaction by polling the result from API Gateway.
   * This is used by minting and listing so far.
   * This should not be waited for. It runs in the background.
   * It resolves once:
   * 1- The transaction is committed with 'processed', 'rejected', or 'failed'.
   * 2- When it completes its tasks:
   *    a- Checking for transaction to commit
   *    b- Updating relevant docs in DB while / after polling
   *    c- Logging any errors
   * @param avnRequestId request ID returned by API Gateway
   * @param nftId NFT ID
   * @param pollingOperation operation to be polled
   * @param localRequestId request ID returned to this BE consumer
   * @param externalRef external reference of NFT
   */
  private getConfirmation(
    avnRequestId: string,
    nftId: string,
    pollingOperation: ApiGateWayPollingOption,
    localRequestId: string,
    externalRef?: string
  ): void {
    ;(async () => {
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
          `[AvnTransactionApiGatewayService.getConfirmation] Polling for ${pollingOperation}. ` +
            `Transaction status: ${polledState.status}`
        )

        this.updateNftStatus(nftId, polledState.status, pollingOperation)

        // If transaction is committed stop polling
        if (this.transactionIsCommitted(polledState)) {
          transactionCommitted = true
          this.log.log(
            `[AvnTransactionApiGatewayService.getConfirmation] ${pollingOperation} transaction ` +
              `of local request ID ${localRequestId}, AVN request ID ${avnRequestId}, ` +
              `is committed with status ${polledState.status}`
          )
          break
        }
      }

      // Update transaction history for minting and listing
      await this.updateTransactionHistory(localRequestId, polledState)

      // If it's minting single NFT and is processed, update NFT data with AvN's NFT ID
      if (
        pollingOperation === ApiGateWayPollingOption.mintSingleNft &&
        polledState.status === PollingTransactionStatus.processed
      ) {
        this.log.debug(
          `[AvnTransactionApiGatewayService.getConfirmation] Updating NFT ${nftId} with AvN's NFT ID...`
        )
        await this.updateNftAvnNftId(nftId, externalRef)
      }

      // If it's listing NFT and is processed, update NFT status to forSale
      // Note: saleOpen has been set by NFT list controller
      if (
        pollingOperation === ApiGateWayPollingOption.listSingleNft &&
        polledState.status === PollingTransactionStatus.processed
      ) {
        this.log.debug(
          `[AvnTransactionApiGatewayService.getConfirmation] Updating NFT ${nftId} status to listed...`
        )
        this.updateNftListingStatus(nftId, NftStatus.forSale)
      }

      // If transaction is not committed, log error
      if (!transactionCommitted) {
        this.log.error(
          `[AvnTransactionApiGatewayService.getConfirmation] ${pollingOperation} transaction` +
            `of request ID ${localRequestId}, AVN request ID ${avnRequestId}, ` +
            ` has timed out with status: ${polledState.status} `
        )
      }
    })()
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

    this.log.debug(
      `[AvnTransactionApiGatewayService.updateTransactionHistory] Transaction history updated to: ${state}`
    )
  }

  /**
   * Update NFT status to adapted status from API Gateway polling
   * @param nftId NFT ID
   * @param avnPolState AVN polling state
   * @param pollingOperation Polling operation
   */
  private updateNftStatus(
    nftId: string,
    avnPolState: string,
    pollingOperation: ApiGateWayPollingOption
  ): void {
    let nftStatus: NftStatus
    switch (avnPolState) {
      case PollingTransactionStatus.pending:
        nftStatus =
          pollingOperation === ApiGateWayPollingOption.mintSingleNft
            ? NftStatus.minting
            : NftStatus.saleOpening
        break
      case PollingTransactionStatus.processed:
        nftStatus =
          pollingOperation === ApiGateWayPollingOption.mintSingleNft
            ? NftStatus.minted
            : NftStatus.forSale
        break
      case PollingTransactionStatus.rejected:
        nftStatus =
          pollingOperation === ApiGateWayPollingOption.mintSingleNft
            ? NftStatus.draft
            : NftStatus.minted
        break
      default:
        nftStatus = NftStatus.draft
    }

    this.log.debug(
      `[AvnTransactionApiGatewayService.updateNftMintStatus] ` +
        `Updating NFT ${nftId} status to ${nftStatus} ` +
        `according to AvN poll status ${avnPolState}`
    )

    firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'setStatusToNft'), {
        nftId,
        nftStatus
      })
    ).then((res: Nft) => {
      this.log.debug(
        `[AvnTransactionApiGatewayService.updateNftMintStatus] NFT status updated ${res}`
      )
    })
  }

  /**
   * Get NFT status from polled state
   * @param nftId NFT ID
   * @param nftStatus NFT status
   */
  private updateNftListingStatus(nftId: string, nftStatus: NftStatus): void {
    this.log.debug(
      `[AvnTransactionApiGatewayService.updateNftListingStatus] Updating NFT ${nftId} status...`
    )
    firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'setStatusToNft'), {
        nftId,
        nftStatus
      })
    ).then((res: Nft) => {
      this.log.debug(
        `[AvnTransactionApiGatewayService.updateNftListingStatus] NFT status updated ${res}`
      )
    })
  }

  /**
   * Update NFT data with AvN's NFT ID.
   * This gets NFT ID via the APT Gateway and updates the NFT data.
   * @param nftId NFT ID
   * @param externalRef External reference
   */
  private async updateNftAvnNftId(
    nftId: string,
    externalRef: string
  ): Promise<void> {
    this.log.debug(
      `[AvnTransactionApiGatewayService.updateNftAvnNftId] Getting NFT ID from AvN...`
    )
    const avnNftId = await this.getNftIdFromAvn(externalRef)

    firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('nft', 'setAvnNftIdToNft'),
        {
          avnNftId,
          nftId
        }
      )
    ).then((res: Nft) => {
      this.log.debug(
        `[AvnTransactionApiGatewayService.updateNftAvnNftId] NFT status updated ${res}`
      )
    })
  }

  /**
   * Get NFT ID from AvN via API Gateway
   * @param externalRef the External reference used to mint the NFT
   */
  private async getNftIdFromAvn(externalRef: string): Promise<string> {
    let res = null
    for (let i = 0; i < 3 && !res; i++) {
      res = await this.avnApi.query.getNftId(externalRef)
      if (!res) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        break
      }
    }

    if (!res) {
      this.log.error(
        '[AvnTransactionApiGatewayService.getNftIdFromAvn] NFT ID form AvN not found'
      )
      throw new Error('AvN NFT ID not found')
    }

    this.log.debug(
      `[AvnTransactionApiGatewayService.getNftIdFromAvn] NFT ID from AvN: ${res}`
    )
    return res
  }

  /**
   * List single NFT
   * @param nftId NFT ID
   * @param avnNftId AvN NFT ID
   * @param localRequestId Local request ID
   */
  async listSingleNft(
    nftId: string,
    avnNftId: string,
    localRequestId: string
  ): Promise<void> {
    try {
      const avnRelayer = this.configService.get<string>('app.avn.relayer')

      const avnRequestId = await this.avnApi.send.listFiatNftForSale(
        avnRelayer,
        avnNftId
      )

      this.log.debug(
        `[AvnTransactionApiGatewayService] List NFT result via API Gateway: ${avnRequestId}`
      )

      this.getConfirmation(
        avnRequestId,
        nftId,
        ApiGateWayPollingOption.listSingleNft,
        localRequestId
      )
    } catch (error) {
      this.log.error(
        `[AvnTransactionApiGatewayService.listSingleNft] Error listing NFT via API Gateway: ${nftId}`
      )
      throw error
    }
  }
}
