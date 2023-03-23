import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Model } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import { ClientProxy } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { AvnNftTransaction, Royalties } from '../schemas/avn-transaction.schema'
import {
  ApiGateWayPollingOption,
  AuctionStatus,
  AvnTransactionState,
  PollingTransactionStatus
} from '../../shared/enum'
import { AvnApi, AvnPolState } from '../schemas/avn-api'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { NftStatus } from '../../shared/enum'
import { Nft } from '../../nft/schemas/nft.schema'
import { uuidFrom } from '../../utils'
import { CancelListingAvnTransactionDto } from '../dto/mint-avn-transaction.dto'
import { Auction } from '../../listing/schemas/auction.schema'
import { BullMqService } from '../../bull-mq/bull-mq.service'

@Injectable()
export class AvnTransactionApiGatewayService {
  private avnApi: AvnApi
  private avnPollingInterval: number
  private avnPollingTimeout: number
  private pollingLoops: number
  private readonly logger = new Logger(AvnTransactionApiGatewayService.name)

  constructor(
    private configService: ConfigService,
    private bullMqService: BullMqService,
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    @InjectModel(Auction.name)
    private auctionModel: Model<Auction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.configService = configService
    this.initTheApi()

    this.avnPollingInterval =
      this.configService.get<number>('app.avn.pollingInterval') || 5000 // 5 seconds

    this.avnPollingTimeout =
      this.configService.get<number>('app.avn.avnPollingTimeout') || 180000 // 3 minutes

    this.pollingLoops = Math.floor(
      this.avnPollingTimeout / this.avnPollingInterval
    )
  }

  /**
   * Mint a single NFT with API Gateway
   * @param nftId NFT ID
   * @param localRequestId request ID returned to this BE consumer
   * @param royalties Royalties
   */
  async mintSingleNft(
    nftId: string,
    localRequestId: string,
    royalties: Royalties[]
  ): Promise<void> {
    try {
      const avnRelayer = this.configService.get<string>('app.avn.relayer')
      const externalRef = this.createExternalRef(nftId)
      const avnAuthority = this.configService.get<string>(
        'app.avn.avnAuthority'
      )

      const mintResult = await this.avnApi.send.mintSingleNft(
        avnRelayer,
        externalRef,
        royalties,
        avnAuthority
      )

      this.logger.debug(`Mint NFT result from API Gateway: ${mintResult}`)

      this.getConfirmationOnMintingOrListing(
        mintResult,
        nftId,
        ApiGateWayPollingOption.mintSingleNft,
        localRequestId,
        null,
        externalRef
      )
    } catch (e) {
      this.logger.error(`Error minting NFT via API Gateway: ${nftId}`)
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
  private getConfirmationOnMintingOrListing(
    avnRequestId: string,
    nftId: string,
    pollingOperation: ApiGateWayPollingOption,
    localRequestId: string,
    auction?: Auction,
    externalRef?: string
  ): void {
    ;(async () => {
      let transactionCommitted = false
      let polledState: AvnPolState = null

      // Polling
      for (let i = 0; i < this.pollingLoops; i++) {
        await new Promise(resolve =>
          setTimeout(resolve, this.avnPollingInterval)
        )
        polledState = await this.avnApi.poll.requestState(avnRequestId)

        this.logger.debug(
          `Polling for ${pollingOperation}. ` +
            `Transaction status: ${polledState.status}`
        )

        this.updateNftStatusForMintingAndListing(
          nftId,
          polledState.status,
          pollingOperation
        )

        // If transaction is committed stop polling
        if (this.transactionIsCommitted(polledState)) {
          transactionCommitted = true
          this.logger.log(
            `${pollingOperation} transaction ` +
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
        this.logger.debug(`Updating NFT ${nftId} with AvN's NFT ID...`)
        await this.updateNftAvnNftId(nftId, externalRef)
      }

      // If it's listing NFT and is processed, update NFT status to forSale
      // Note: saleOpen has been set by NFT list controller
      if (
        pollingOperation === ApiGateWayPollingOption.listSingleNft &&
        polledState.status === PollingTransactionStatus.processed
      ) {
        this.logger.debug(`Updating NFT ${nftId} status to listed...`)
        await this.updateNftStatus(nftId, NftStatus.forSale)
      }

      // If transaction is not committed, log error
      if (!transactionCommitted) {
        this.logger.error(
          `${pollingOperation} transaction` +
            `of request ID ${localRequestId}, AVN request ID ${avnRequestId}, ` +
            ` has timed out with status: ${polledState.status} `
        )

        // Set auction status to error
        if (pollingOperation === ApiGateWayPollingOption.listSingleNft) {
          await this.auctionModel.findOneAndUpdate(
            { _id: auction._id },
            { status: AuctionStatus.error }
          )
        }

        // Set NFT status to draft
        else if (pollingOperation === ApiGateWayPollingOption.mintSingleNft) {
          await this.updateNftStatus(nftId, NftStatus.draft)
        }
      }

      await this.addUpdateCachedItemTask(nftId)
    })()
  }

  /**
   * Get and store confirmations of AvN transaction.
   * This is used by cancelling listing.
   * This should not be waited for. It runs in the background.
   * It resolves when:
   * 1- The transaction is committed with 'processed', 'rejected', or 'failed'.
   * 2- When it completes its tasks:
   *    a- Checking for transaction to commit
   *    b- Updating relevant docs in DB while / after polling
   *    c- Logging any errors
   * @param avnRequestId request ID returned by API Gateway
   * @param auctionId Auction ID
   * @param pollingOperation operation to be polled
   * @param localRequestId request ID returned to this BE consumer
   * @param nft NFT to be cancelled
   *
   */
  private getConfirmationOnCancellingListing(
    avnRequestId: string,
    auctionId: string,
    pollingOperation: ApiGateWayPollingOption.cancelListingSingleNft,
    localRequestId: string,
    nft: Nft
  ): void {
    ;(async () => {
      let transactionCommitted = false
      let polledState: AvnPolState = null

      // Polling
      for (let i = 0; i < this.pollingLoops; i++) {
        await new Promise(resolve =>
          setTimeout(resolve, this.avnPollingInterval)
        )
        polledState = await this.avnApi.poll.requestState(avnRequestId)

        this.logger.debug(
          `Polling for ${pollingOperation}. ` +
            `Transaction status: ${polledState.status}`
        )

        await this.updateAuctionStatusForCancelListing(
          auctionId,
          polledState.status
        )

        // If transaction is committed stop polling
        if (this.transactionIsCommitted(polledState)) {
          transactionCommitted = true
          this.logger.log(
            `${pollingOperation} transaction ` +
              `of local request ID ${localRequestId}, AVN request ID ${avnRequestId}, ` +
              `is committed with status ${polledState.status}`
          )
          break
        }
      }

      // Update NFT status after polling
      this.updateNFTStatusForCancelListing(
        nft._id.toString(),
        polledState.status
      )

      // Update transaction history for cancelling listing
      await this.updateTransactionHistory(localRequestId, polledState)

      // If transaction is not committed, log error
      if (!transactionCommitted) {
        this.logger.error(
          `${pollingOperation} transaction` +
            `of request ID ${localRequestId}, AVN request ID ${avnRequestId}, ` +
            ` has timed out with status: ${polledState.status} `
        )
      }

      await this.addUpdateCachedItemTask(nft._id.toString())
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

    this.logger.debug(
      `Transaction ${localRequestId} history updated to: ${state}`
    )
  }

  /**
   * Update NFT status to adapted status from API Gateway polling.
   * This is for minting and listing.
   * @param nftId NFT ID
   * @param avnPolState AVN polling state
   * @param pollingOperation Polling operation
   */
  private updateNftStatusForMintingAndListing(
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

    this.logger.debug(
      `Updating NFT ${nftId} status to ${nftStatus} ` +
        `according to AvN poll status ${avnPolState}`
    )

    this.updateNftStatus(nftId, nftStatus)
  }

  /**
   * Update Auction status to adapted status from API Gateway polling
   * @param auctionId Auction ID
   * @param avnPolState AVN polling state
   */
  private async updateAuctionStatusForCancelListing(
    auctionId: string,
    avnPolState: string
  ): Promise<void> {
    let auctionStatus: AuctionStatus
    switch (avnPolState) {
      case PollingTransactionStatus.pending:
        auctionStatus = AuctionStatus.closing
        break
      case PollingTransactionStatus.processed:
        auctionStatus = AuctionStatus.withdraw
        break
      case PollingTransactionStatus.rejected:
        auctionStatus = AuctionStatus.open
        break
      default:
        auctionStatus = AuctionStatus.error
    }

    this.logger.debug(
      `Updating Auction ${auctionId} status to ${auctionStatus} ` +
        `according to AvN poll status ${avnPolState}`
    )

    // Update auction status
    await this.auctionModel.findOneAndUpdate(
      { _id: uuidFrom(auctionId) },
      { status: auctionStatus }
    )
  }

  /**
   * Update NFT status to adapted status from API Gateway polling.
   * This is for cancel listing.
   * @param nftId NFT ID
   * @param avnPolState AVN polling state
   */
  private async updateNFTStatusForCancelListing(
    nftId: string,
    avnPolState: string
  ): Promise<void> {
    let nftStatus: NftStatus
    switch (avnPolState) {
      case PollingTransactionStatus.pending:
        nftStatus = NftStatus.saleClosing
        break
      case PollingTransactionStatus.processed:
        nftStatus = NftStatus.minted
        break
      case PollingTransactionStatus.rejected:
        nftStatus = NftStatus.forSale
        break
    }

    this.logger.debug(
      `Updating NFT ${nftId} status to ${nftStatus} ` +
        `according to AvN poll status ${avnPolState}`
    )

    await this.updateNftStatus(nftId, nftStatus)
  }

  /**
   * Get NFT status from polled state
   * @param nftId NFT ID
   * @param nftStatus NFT status
   */
  private async updateNftStatus(
    nftId: string,
    nftStatus: NftStatus
  ): Promise<void> {
    this.logger.debug(`Updating NFT ${nftId} status...`)
    await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'setStatusToNft'), {
        nftId,
        nftStatus
      })
    ).then((res: Nft) => {
      this.logger.debug(`NFT status updated ${res?.status}`)
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
    this.logger.debug(`Getting NFT ID from AvN...`)
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
      this.logger.debug(`NFT status updated ${res?.status}`)
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
      this.logger.error('NFT ID form AvN not found')
      throw new Error('AvN NFT ID not found')
    }

    this.logger.debug(`NFT ID from AvN: ${res}`)
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
    localRequestId: string,
    auction: Auction
  ): Promise<void> {
    try {
      const avnRelayer = this.configService.get<string>('app.avn.relayer')

      const avnRequestId = await this.avnApi.send.listFiatNftForSale(
        avnRelayer,
        avnNftId
      )

      this.logger.debug(`List NFT result via API Gateway: ${avnRequestId}`)

      this.getConfirmationOnMintingOrListing(
        avnRequestId,
        nftId,
        ApiGateWayPollingOption.listSingleNft,
        localRequestId,
        auction
      )
    } catch (error) {
      this.logger.error(`Error listing NFT via API Gateway: ${nftId}`)
      throw error
    }
  }

  /**
   * Cancel single NFT listing via API Gateway
   * @param cancelListAvnTransaction cancel listing AvN transaction DTO
   * @param nft NFT object model
   */
  async cancelFiatNftListing(
    cancelListAvnTransaction: CancelListingAvnTransactionDto,
    nft: Nft
  ): Promise<void> {
    try {
      const avnRelayer = this.configService.get<string>('app.avn.relayer')

      const avnRequestId = await this.avnApi.send.cancelFiatNftListing(
        avnRelayer,
        cancelListAvnTransaction.data.avnNftId
      )

      this.logger.debug(
        `Cancel NFT listing request ID from API Gateway: ${avnRequestId}`
      )

      this.getConfirmationOnCancellingListing(
        avnRequestId,
        cancelListAvnTransaction.auctionId,
        ApiGateWayPollingOption.cancelListingSingleNft,
        cancelListAvnTransaction.request_id,
        nft
      )
    } catch (error) {
      this.logger.error(
        `Error cancelling fiat listing of NFT ${nft._id} via API Gateway: ` +
          JSON.stringify(error)
      )

      throw error
    }
  }

  /**
   * Updated ached item via Bull MQ queue
   * @param nftId NFT ID
   */
  private async addUpdateCachedItemTask(id: string): Promise<void> {
    this.logger.debug(`Updating cached item ${id}...`)
    await this.bullMqService.addToQueue(
      'updateCachedItem',
      { id, type: 'NFT' },
      {
        jobId: `updateCachedItem:NFT:${id}`,
        delay: 2000
      }
    )
  }
}
