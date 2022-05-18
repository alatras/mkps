import { WinstonModule } from 'nest-winston'
import { NestFactory } from '@nestjs/core'
import * as winston from 'winston'
import { ConsoleTransportInstance } from 'winston/lib/winston/transports'
import DailyRotateFile from 'winston-daily-rotate-file'

import { AppModule } from './app.module'

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

const level = () => {
  const env = process.env.NODE_ENV || 'development'

  const isDevelopment = ['development', 'local'].includes(env)
  return isDevelopment ? 'debug' : 'warn'
}

const { timestamp, errors } = winston.format

const format = winston.format.combine(
  timestamp(),
  winston.format.printf(info => {
    const data = info['data'] ? `\n${JSON.stringify(info['data'])}` : ''

    let message = info.message ?? ''

    if (info['stack']) {
      const stacks = Array.isArray(info['stack'])
        ? info['stack']
        : [info['stack']]

      message = stacks.reduce((vs, stack) => {
        if (stack.constructor === Object) {
          return `${vs}\n${JSON.stringify(stack)}`
        }
        return `${vs}\n${stack}`
      }, message)
    }

    const context = info['context'] ? ` [${info['context']}] ` : ' '

    return `${info.timestamp} ${info.level}:${context}${message}${data}`
  }),
  errors({ stack: true })
)

const consoleTransport = new winston.transports.Console()

const transports: (ConsoleTransportInstance | DailyRotateFile)[] = [
  consoleTransport
]

const dailyRotateFileTransport = new DailyRotateFile({
  filename: 'application.log',
  dirname: 'logs',
  frequency: '1d',
  maxSize: '20m'
})

transports.push(dailyRotateFileTransport)

export const logger = WinstonModule.createLogger({
  level: level(),
  levels,
  format,
  transports
})

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger
  })

  app.enableCors()

  await app.listen(5001)
}
bootstrap()
