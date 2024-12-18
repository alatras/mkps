import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Model } from 'mongoose'
import { firstValueFrom } from 'rxjs'
import { ClientProxy } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { AvnNftTransaction, Royalties } from '../schemas/avn-transaction.schema'
import { User } from '../../user/schemas/user.schema'
import {
  ApiGateWayPollingOption,
  AuctionStatus,
  AvnTransactionState,
  PollingTransactionStatus
} from '../../shared/enum'
import { AvnPolState } from '../schemas/avn-api'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { NftStatus } from '../../shared/enum'
import { Nft } from '../../nft/schemas/nft.schema'
import { uuidFrom } from '../../utils'
import { CancelListingAvnTransactionDto } from '../dto/mint-avn-transaction.dto'
import { Auction } from '../../listing/schemas/auction.schema'
import { BullMqService, Queues } from '../../bull-mq/bull-mq.service'
import { AvnTransactionApiSetupService } from './avn-transaction-api-setup.service'
import { AvnApi } from '../schemas/avn-api'
import { MUUID } from 'uuid-mongodb'

@Injectable()
export class AvnTransactionApiGatewayService {
  private avnPollingInterval: number
  private avnPollingTimeout: number
  private pollingLoops: number
  private readonly logger = new Logger(AvnTransactionApiGatewayService.name)

  constructor(
    private configService: ConfigService,
    private bullMqService: BullMqService,
    private apiSetupService: AvnTransactionApiSetupService,
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    @InjectModel(Auction.name)
    private auctionModel: Model<Auction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.configService = configService

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
    user: User,
    localRequestId: string,
    royalties: Royalties[]
  ): Promise<void> {
    try {
      const externalRef = this.createExternalRef(nftId)
      const avnAuthority = this.configService.get<string>(
        'app.avn.avnAuthority'
      )
      const avnApi = await this.apiSetupService.getAndLockAvnApiInstance(user)

      const mintResult = await avnApi.send.mintSingleNft(
        externalRef,
        royalties,
        avnAuthority
      )

      this.logger.debug(`Mint NFT result from API Gateway: ${mintResult}`)

      this.getConfirmationOnMintingOrListing(
        avnApi,
        mintResult,
        nftId,
        ApiGateWayPollingOption.mintSingleNft,
        localRequestId,
        null,
        externalRef
      )

      /**
       * @important
       * Consider the avnApi instance above to be locked until
       * the asynchronous 'getConfirmation...' operation is completed.
       * Take this into account when adding any additional logic in this section.
       */
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
    avnApi: AvnApi,
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
        polledState = await avnApi.poll.requestState(avnRequestId)

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
      await this.updateTransactionHistory(
        localRequestId,
        polledState,
        uuidFrom(nftId)
      )

      // If it's minting single NFT and is processed, update NFT data with AvN's NFT ID
      if (
        pollingOperation === ApiGateWayPollingOption.mintSingleNft &&
        polledState.status === PollingTransactionStatus.processed
      ) {
        this.logger.debug(`Updating NFT ${nftId} with AvN's NFT ID...`)
        await this.updateNftAvnNftId(avnApi, nftId, externalRef)
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

      // Add task to update cached item
      await this.addUpdateCachedItemTask(nftId)

      // Release avnAPI lock
      await this.apiSetupService.unlockAvnApiInstance()
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
    avnApi: AvnApi,
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
        polledState = await avnApi.poll.requestState(avnRequestId)

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
      await this.updateTransactionHistory(
        localRequestId,
        polledState,
        uuidFrom(auctionId)
      )

      // If transaction is not committed, log error
      if (!transactionCommitted) {
        this.logger.error(
          `${pollingOperation} transaction` +
            `of request ID ${localRequestId}, AVN request ID ${avnRequestId}, ` +
            ` has timed out with status: ${polledState.status} `
        )
      }

      // Add task to update cached item
      await this.addUpdateCachedItemTask(nft._id.toString())

      // Release avnAPI lock
      await this.apiSetupService.unlockAvnApiInstance()
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
   * Update API transaction history
   * @param localRequestId request ID returned to this BE consumer
   * @param polledState Polled state
   */
  private async updateTransactionHistory(
    localRequestId: string,
    polledState: AvnPolState,
    nftId: MUUID
  ): Promise<void> {
    const state: AvnTransactionState =
      polledState.status === PollingTransactionStatus.processed
        ? AvnTransactionState.PROCESSING_COMPLETE
        : polledState.status === PollingTransactionStatus.rejected
        ? AvnTransactionState.AVN_REJECTED
        : AvnTransactionState.PROCESSING_FAILED

    const existingTransaction = await this.avnTransactionModel.findOne({
      request_id: localRequestId
    })

    if (existingTransaction) {
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
    } else {
      await this.avnTransactionModel.create({
        request_id: localRequestId,
        state: state,
        nftId,
        history: [
          {
            state: state,
            txHash: polledState.txHash,
            blockNumber: polledState.blockNumber,
            transactionIndex: polledState.transactionIndex,
            timestamp: new Date().toISOString()
          }
        ]
      })
    }

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
    avnApi: AvnApi,
    nftId: string,
    externalRef: string
  ): Promise<void> {
    this.logger.debug(`Getting NFT ID from AvN...`)
    const avnNftId = await this.getNftIdFromAvn(avnApi, externalRef)

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
  private async getNftIdFromAvn(
    avnApi: AvnApi,
    externalRef: string
  ): Promise<string> {
    let res = null
    for (let i = 0; i < 3 && !res; i++) {
      res = await avnApi.query.getNftId(externalRef)
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
    user: User,
    avnNftId: string,
    localRequestId: string,
    auction: Auction
  ): Promise<void> {
    try {
      const avnApi = await this.apiSetupService.getAndLockAvnApiInstance(user)
      const avnRequestId = await avnApi.send.listFiatNftForSale(avnNftId)

      this.logger.debug(`List NFT result via API Gateway: ${avnRequestId}`)

      this.getConfirmationOnMintingOrListing(
        avnApi,
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
    nft: Nft,
    user: User
  ): Promise<void> {
    try {
      const avnApi = await this.apiSetupService.getAndLockAvnApiInstance(user)
      const avnRequestId = await avnApi.send.cancelFiatNftListing(
        cancelListAvnTransaction.data.avnNftId
      )

      this.logger.debug(
        `Cancel NFT listing request ID from API Gateway: ${avnRequestId}`
      )

      this.getConfirmationOnCancellingListing(
        avnApi,
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
      Queues.task,
      'updateCachedItem',
      { id, type: 'NFT' },
      {
        jobId: `updateCachedItem:NFT:${id}`,
        delay: 2000
      }
    )
  }
}
