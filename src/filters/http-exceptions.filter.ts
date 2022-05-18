import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { Response } from 'express'

@Catch(HttpException)
export class HttpExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse = exception.getResponse()

    let formattedErrorObject = {
      statusCode: exception.getStatus(),
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exception.message,
      timestamp: new Date().toISOString(),
      path: request.url
    }

    if (typeof exceptionResponse === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      formattedErrorObject = { ...formattedErrorObject, ...exceptionResponse }
    }

    response.status(status).json(formattedErrorObject)
  }
}
