export interface AvnApi {
  send?: any
  poll?: any
  init: () => Promise<AvnApi>
}

export interface AvnPolState {
  txHash: string
  status: string
  blockNumber: string
  transactionIndex: string
}
