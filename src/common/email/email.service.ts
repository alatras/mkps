import {
  Injectable,
  Logger,
  Inject,
  NotAcceptableException
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { MUUID } from 'uuid-mongodb'
import { Nft } from '../../nft/schemas/nft.schema'
import { Auction } from '../../listing/schemas/auction.schema'
import { Bid } from '../../payment/schemas/bid.dto'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { uuidFrom } from '../../utils/uuid'
import { BullJobs, BullMqService, Queues } from '../../bull-mq/bull-mq.service'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private readonly bullMqService: BullMqService
  ) {}

  async sendFirstBidNotificationToOwner(auction: Auction, bid: Bid) {
    try {
      const nft = await this.getNftById(auction.nft._id)
      if (!nft) {
        this.logger.error(
          `[sendFirstBidNotificationToOwner] No NFT found for auction ${auction._id}`
        )
        throw new NotAcceptableException(
          `No NFT found for auction ${auction._id}`
        )
      }

      const nftData = await this.getNftEmailData(nft, auction, bid.value)

      await this.addSendEmailJob({
        templateName: 'seller_bids',
        userId: auction.seller._id,
        data: { firstBidValue: bid.value, nft: nftData }
      })
    } catch (e) {
      this.logger.error(e)
    }
  }

  sendOutbidNotificationToSecondHighestBidder = async (
    auction: Auction,
    secondHighestBid: Bid,
    highestBidValue: string
  ) => {
    try {
      const nft = await this.getNftById(auction.nft._id)
      if (!nft) {
        this.logger.error(
          `[sendOutbidNotificationToSecondHighestBidder] Nft not found (${auction.nft._id})`
        )
        return
      }

      const nftEmailData = await this.getNftEmailData(
        nft,
        auction,
        secondHighestBid.value
      )

      await this.addSendEmailJob({
        templateName: 'buyer_outbid_auction',
        userId: secondHighestBid.owner._id,
        data: {
          highestBidValue,
          nft: nftEmailData
        }
      })
    } catch (e) {
      this.logger.error(
        `[sendOutbidNotificationToSecondHighestBidder] error ${e.message}`
      )
    }
  }

  /**
   * Gets NFT by ID from NFT service
   * @param nftId NFT ID
   */
  private async getNftById(nftId: MUUID): Promise<Nft> {
    return await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator('nft', 'findOneById'),
        nftId.toString()
      )
    )
  }

  /**
   * Gets NFT email data from NFT service
   * @param nft NFT
   * @param listing Listing
   * @param bidValue Bid value
   * @returns NFT email data
   */
  private async getNftEmailData(
    nft: Nft,
    listing: Auction | EditionListing,
    bidValue?: string
  ) {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'getNftEmailData'), {
        nft,
        listing,
        bidValue
      })
    )
  }

  addSendEmailJob = async (params: {
    templateName: string
    userId: MUUID
    data: {
      [key: string]: any
    }
    delay?: number
    cc?: MUUID[]
    bcc?: MUUID[]
  }) => {
    const userUuid = uuidFrom(params.userId).toString()

    await this.bullMqService.addToQueue(
      Queues.main,
      BullJobs.sendEmailNotification,
      {
        templateName: params.templateName,
        userId: uuidFrom(params.userId).toString(),
        data: params.data,
        cc: params.cc?.map(id => uuidFrom(id).toString()),
        bcc: params.bcc?.map(id => uuidFrom(id).toString())
      },
      {
        delay: params.delay,
        jobId: `${params.templateName}:${userUuid}:${params.data.listingId}`
      }
    )
  }
}
