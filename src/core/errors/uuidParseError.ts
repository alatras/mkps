import { ErrorDetail } from './'

export class UUIDParseError extends Error {
  constructor(message?: string, public details?: ErrorDetail) {
    super(message || 'Cannot parse UUID.')
    this.name = UUIDParseError.name
    this.details = details
  }
}
