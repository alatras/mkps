import { ConfigService } from '@nestjs/config'
import { RedisOptions } from '@nestjs/microservices'
import appConfig from '../config/app.config'

export function getRedisOptions(): RedisOptions['options'] {
  const configService = new ConfigService(appConfig)
  return {
    host: configService.get<string>('REDIS_HOST'),
    port: configService.get<number>('REDIS_PORT')
  }
}
