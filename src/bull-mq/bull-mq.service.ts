import {
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue, JobOptions } from 'bull'
import { MUUID } from 'uuid-mongodb'
import { uuidFrom } from '../utils'

export const MAIN_BULL_QUEUE_NAME = 'vere_tasks'

export enum Queues {
  main = 'main',
  task = 'task'
}

export enum BullJobs {
  checkForAuctionsClosing = 'checkForAuctionsClosing',
  checkForEditionListingsClosing = 'checkForEditionListingsClosing',
  processEditionAirdrop = 'processEditionAirdrop',
  processSingleNftAirdrop = 'processSingleNftAirdrop',
  handleNftChangeStream = 'handleNftChangeStream',
  sendEmailNotification = 'sendEmailNotification',
  sendEthAuctionNotification = 'sendEthAuctionNotification',
  updateAllNftsAndEditions = 'updateAllNftsAndEditions',
  sendEthEditionListingNotification = 'sendEthEditionListingNotification',
  updateCachedItem = 'updateCachedItem',
  calculateLeaderboardPoints = 'calculateLeaderboardPoints',
  calculateLeaderboardRanks = 'calculateLeaderboardRanks',
  closeFixedPriceAuction = 'closeFixedPriceAuction',
  cacheCmsSettings = 'cacheCmsSettings'
}

@Injectable()
export class BullMqService {
  private readonly logger = new Logger(BullMqService.name)

  constructor(
    @InjectQueue(MAIN_BULL_QUEUE_NAME) private tasksQueue: Queue,
    @InjectQueue(MAIN_BULL_QUEUE_NAME) private mainQueue: Queue
  ) {}

  async addToQueue(
    queue: Queues,
    jobName: string,
    data: any,
    options: JobOptions
  ) {
    this.logger.debug(`Adding job ${jobName} to queue`)
    try {
      await this.tasksQueue.add(jobName, data, options)

      switch (queue) {
        case Queues.task:
          await this.tasksQueue.add(jobName, data, options)
        case Queues.main:
          return this.mainQueue?.add(jobName, data, options)
        default:
          throw new InternalServerErrorException(
            `[addToQueue] Queue ${queue} is not set up`
          )
      }
    } catch (e) {
      this.logger.error(
        `[addToQueue] Error adding job ${jobName} to queue`,
        e.message
      )
      throw e
    }
  }

  async addSendEmailJob(params: {
    templateName: string
    userId: MUUID
    data: {
      [key: string]: any
    }
    delay?: number
    cc?: MUUID[]
    bcc?: MUUID[]
  }) {
    try {
      const userUuid = uuidFrom(params.userId).toString()

      await this.addToQueue(
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
    } catch (e) {
      this.logger.error(
        `[addSendEmailJob] Error adding send email job to queue`,
        e.message
      )
      throw e
    }
  }
}
