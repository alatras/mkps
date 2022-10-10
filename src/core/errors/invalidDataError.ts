import { ErrorDetail } from './';

export class InvalidDataError extends Error {
  constructor(message?: string, public details?: ErrorDetail) {
    super(message || 'Data are invalid.');
    this.name = InvalidDataError.name;
    this.details = details;
  }
}
