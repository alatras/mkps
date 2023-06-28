import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Ioredis from 'ioredis'
import { ResourceLockedError, default as Redlock, Lock } from 'redlock'

@Injectable()
export class RedisService {
  private configService: ConfigService
  private readonly logger = new Logger(RedisService.name)
  private ioredisClient: any
  private redlock: any

  constructor(configService: ConfigService) {
    this.configService = configService
    this.setupRedLock()
    this.watch()
  }

  /**
   * Acquire a lock on a resource
   * @param resourceKey
   * @param lockDuration
   * @returns
   */
  acquireRedLock = async (
    resourceKey: string[],
    lockDuration: number
  ): Promise<Lock> => {
    return await this.redlock.acquire([resourceKey], lockDuration)
  }

  /**
   * Watch and log errors from redlock
   */
  private watch() {
    if (this.redlock) {
      this.redlock.on('error', error => {
        // Ignore cases where a resource is explicitly marked as locked on a client
        if (error instanceof ResourceLockedError) {
          return
        }
        // Log other errors
        this.logger.error(error)
      })
    }
  }

  /**
   * Set up redlock
   */
  private setupRedLock() {
    const redisHost = this.configService.get<string>('app.redis.host')
    const redisPort = this.configService.get<string>('app.redis.port')

    if (!redisHost || !redisPort) {
      const message = 'Redis host/port is not defined'
      this.logger.error(`[setupRedLock] ${message}`)
      throw new InternalServerErrorException(message)
    }

    this.ioredisClient = !redisHost
      ? null
      : new Ioredis.default({
          host: redisHost,
          port: Number(redisPort)
        })

    this.redlock = !this.ioredisClient
      ? null
      : new Redlock([this.ioredisClient], {
          driftFactor: 0.01,
          retryCount: 30,
          retryDelay: 1000,
          retryJitter: 200,
          automaticExtensionThreshold: 500
        })
  }
}
