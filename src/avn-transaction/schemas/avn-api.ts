import { Royalties } from './avn-transaction.schema'

export interface AvnApi {
  send?: {
    mintSingleNft: (
      avnRelayer: string,
      externalRef: string,
      royalties: Royalties[],
      avnAuthority: string
    ) => Promise<string>
    listFiatNftForSale: (
      avnRelayer: string,
      avnNftId: string
    ) => Promise<string>
    cancelFiatNftListing: (
      avnRelayer: string,
      avnNftId: string
    ) => Promise<string>
  }
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
