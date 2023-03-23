import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue, JobOptions } from 'bull'

export const MAIN_BULL_QUEUE_NAME = 'vere_tasks'

@Injectable()
export class BullMqService {
  private readonly logger = new Logger(BullMqService.name)

  constructor(@InjectQueue(MAIN_BULL_QUEUE_NAME) private tasksQueue: Queue) {}

  async addToQueue(jobName: string, data: any, options: JobOptions) {
    this.logger.debug(`Adding job ${jobName} to queue`)
    try {
      await this.tasksQueue.add(jobName, data, options)
    } catch (e) {
      this.logger.error(`Error adding job ${jobName} to queue`, e.message)
      throw e
    }
  }
}
