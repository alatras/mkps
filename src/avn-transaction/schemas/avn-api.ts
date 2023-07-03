import { Royalties } from './avn-transaction.schema'

export interface AvnApi {
  isInitialised: boolean
  send?: {
    mintSingleNft: (
      externalRef: string,
      royalties: Royalties[],
      avnAuthority: string
    ) => Promise<string>
    listFiatNftForSale: (avnNftId: string) => Promise<string>
    cancelFiatNftListing: (avnNftId: string) => Promise<string>
  }
  poll?: any
  query?: { getNftId: (query: string) => Promise<string> }
  utils: {
    publicKeyToAddress: (accountAddressOrPublicKey: string) => string
  }
  init: () => Promise<any>
  setSigner: (signer: ApiSigner) => Promise<any>
  signer: () => ApiSigner
}

export interface AvnPolState {
  txHash: string
  status: string
  blockNumber: string
  transactionIndex: string
}

export interface ApiSigner {
  sign: (message: string) => Promise<string>
  address: string
  publicKey?: string
}
