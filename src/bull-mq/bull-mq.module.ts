import { Module } from '@nestjs/common'
import { BullMqService } from './bull-mq.service'
import { BullModule } from '@nestjs/bull'
import { MAIN_BULL_QUEUE_NAME } from './bull-mq.service'

@Module({
  imports: [BullModule.registerQueue({ name: MAIN_BULL_QUEUE_NAME })],
  providers: [BullMqService],
  exports: [BullMqService]
})
export class BullMqModule {}
