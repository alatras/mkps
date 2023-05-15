import { Module } from '@nestjs/common'
import {
  ClientProxy,
  ClientProxyFactory,
  Closeable,
  Transport
} from '@nestjs/microservices'
import { BullModule } from '@nestjs/bull'
import { getRedisOptions } from '../utils/get-redis-options'
import { EmailService } from './email/email.service'
import { S3Service } from './s3/s3.service'
import { BullMqModule } from '../bull-mq/bull-mq.module'
import { BullMqService, MAIN_BULL_QUEUE_NAME } from '../bull-mq/bull-mq.service'

@Module({
  imports: [
    BullMqModule,
    BullModule.registerQueue({
      name: MAIN_BULL_QUEUE_NAME
    })
  ],
  providers: [
    EmailService,
    BullMqService,
    S3Service,
    {
      provide: 'TRANSPORT_CLIENT',
      useFactory: (): ClientProxy & Closeable => {
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: getRedisOptions()
        })
      }
    }
  ]
})
export class CommonModule {}
