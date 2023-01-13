import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

export const errorResponseGenerator = (err: any) => {
  switch (err.status) {
    case 400:
      throw new BadRequestException(err.message)
    case 401:
      throw new UnauthorizedException(err.message)
    case 422:
      throw new UnprocessableEntityException(err.message)
    case 404:
      throw new NotFoundException(err.message)
    case 409:
      throw new ConflictException(err.message)
    case 500:
      throw new InternalServerErrorException(err.message)
    default:
      throw new InternalServerErrorException(err.message)
  }
}
