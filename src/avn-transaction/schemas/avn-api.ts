export interface AvnApi {
  send?: any
  poll?: any
  query?: { getNftId: (query: string) => Promise<string> }
  init: () => Promise<AvnApi>
}

export interface AvnPolState {
  txHash: string
  status: string
  blockNumber: string
  transactionIndex: string
}
