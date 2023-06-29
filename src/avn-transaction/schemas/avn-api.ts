import { Royalties } from './avn-transaction.schema'

export interface AvnApi {
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
  setSigner: (signer: ApiSigner) => Promise<any>
  signer: () => ApiSigner
  publicKeyToAddress: (avnPubKey: string) => Promise<string>
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
  publicKey: string
}
