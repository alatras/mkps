import { ErrorDetail } from './'

export class InvalidDataError extends Error {
  status: number
  constructor(message?: string, public details?: ErrorDetail, status = 400) {
    super(message || 'Data are invalid.')
    this.name = InvalidDataError.name
    this.details = details
    this.status = status
  }
}
