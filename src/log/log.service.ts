import { Injectable } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'
import { ConsoleTransportInstance } from 'winston/lib/winston/transports'
import DailyRotateFile from 'winston-daily-rotate-file'

@Injectable()
export class LogService {
  constructor() {
    this.transports.push(this.dailyRotateFileTransport)
  }

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

  private format = winston.format.combine(
    this.timestamp(),
    winston.format.printf(info => {
      const data = info['data'] ? `\n${JSON.stringify(info['data'])}` : ''

      let message = info.message ?? ''

      if (info['stack']) {
        const stacks = Array.isArray(info['stack'])
          ? info['stack']
          : [info['stack']]

        if (stacks[0] !== undefined) {
          message = stacks.reduce((vs, stack) => {
            if (stack.constructor === Object) {
              return `${vs}\n${JSON.stringify(stack)}`
            }
            return `${vs}\n${stack}`
          }, message)
        }
      }

      const context = info['context'] ? ` [${info['context']}] ` : ' '

      return `${info.timestamp} ${info.level}:${context}${message}${data}`
    }),
    this.errors({ stack: true })
  )

  private consoleTransport = new winston.transports.Console()

  private transports: (ConsoleTransportInstance | DailyRotateFile)[] = [
    this.consoleTransport
  ]

  private dailyRotateFileTransport = new DailyRotateFile({
    filename: 'application.log',
    dirname: 'logs',
    frequency: '1d',
    maxSize: '20m'
  })

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
