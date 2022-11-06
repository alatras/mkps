export class DataWrapper<T> {
  data?: unknown
  message?: string
  constructor(data: T, message?: string) {
    this.data = data
    this.message = message
  }
}
