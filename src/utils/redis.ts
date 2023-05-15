import { Logger } from '@nestjs/common'
import * as Ioredis from 'ioredis'
import { ResourceLockedError, default as Redlock } from 'redlock'

const logger = new Logger('Redis')

export const ioredisClient = !process.env.REDIS_URL
  ? null
  : new Ioredis.default({
      host: process.env.REDIS_URL,
      port: Number(process.env.REDIS_PORT)
    })

export const redlock = !ioredisClient
  ? null
  : new Redlock([ioredisClient], {
      driftFactor: 0.01,
      retryCount: 30,
      retryDelay: 1000,
      retryJitter: 200,
      automaticExtensionThreshold: 500
    })

if (redlock) {
  redlock.on('error', error => {
    // Ignore cases where a resource is explicitly marked as locked on a client
    if (error instanceof ResourceLockedError) {
      return
    }
    // Log other errors
    logger.error(error)
  })
}
