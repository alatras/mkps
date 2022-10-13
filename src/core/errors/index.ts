export * from './uuidParseError'
export * from './invalidDataError'
export * from './uuidParseError'

export interface ErrorDetail {
  field?: string
  value?: any
  location?: string
  description?: string
}
