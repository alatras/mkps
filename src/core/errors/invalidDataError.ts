import { ErrorDetail } from './'

export class InvalidDataError extends Error {
  status: number
  constructor(message?: string, status?: number, public details?: ErrorDetail) {
    super(message || 'Data are invalid.')
    this.name = InvalidDataError.name
    this.details = details
    this.status = status
  }
}
