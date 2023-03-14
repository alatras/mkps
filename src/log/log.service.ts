import { Injectable } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
// import * as winston from 'winston'
import winston from 'winston'
import { ConsoleTransportInstance } from 'winston/lib/winston/transports'
import DailyRotateFile from 'winston-daily-rotate-file'

@Injectable()
export class LogService {
  constructor() {}

  private timestamp = winston.format.timestamp
  private errors = winston.format.errors

  private levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  }

  private level() {
    const env = process.env.NODE_ENV || 'development'
    const isDevelopment = ['development', 'local'].includes(env)
    return isDevelopment ? 'debug' : 'warn'
  }

  private formatSplat = (splat: Array<any>): string => {
    if (splat && splat.length) {
      return splat.length === 1
        ? JSON.stringify(splat[0])
        : JSON.stringify(splat)
    }
    return ''
  }

  private format = winston.format.combine(
    this.timestamp(),
    winston.format.printf(info => {
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore
      const splat = info[Symbol.for('splat')] ?? {}
      const stack = info['stack']
      const data = info['data']

      const dataStr = data ? `\n${JSON.stringify(data)}` : ''

      const context = splat[0].context || ''

      return `${info.timestamp} ${info.level}: ${
        context ? `[${context}]` : ''
      } ${info.message} ${stack || ''}${dataStr}`
    }),
    this.errors({ stack: true })
  )

  private consoleTransport = new winston.transports.Console()

  private dailyRotateFileTransport = new DailyRotateFile({
    filename: 'application.log',
    dirname: 'logs',
    frequency: '1d',
    maxSize: '20m'
  })

  private transports: (ConsoleTransportInstance | DailyRotateFile)[] = [
    this.consoleTransport,
    this.dailyRotateFileTransport
  ]

  private logger = WinstonModule.createLogger({
    level: this.level(),
    levels: this.levels,
    format: this.format,
    transports: this.transports
  })

  getLogger(): LoggerService {
    return this.logger
  }
}
