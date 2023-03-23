import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch(Error, HttpException)
export class GeneralExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GeneralExceptionsFilter.name)

  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const message =
      status !== 500
        ? exception.message
        : 'Oops, something went wrong. Please try again later.'

    const exceptionResponse = status === 500 ? message : exception.getResponse()

    let formattedErrorObject = {
      statusCode: status,
      message:
        typeof exceptionResponse === 'string' ? exceptionResponse : message,
      timestamp: new Date().toISOString(),
      path: request.url
    }
    if (typeof exceptionResponse === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      formattedErrorObject = { ...formattedErrorObject, ...exceptionResponse }
    }

    this.logger.error(
      JSON.stringify({ ...formattedErrorObject, message: exception.message })
    )

    response.status(status).json(formattedErrorObject)
  }
}
