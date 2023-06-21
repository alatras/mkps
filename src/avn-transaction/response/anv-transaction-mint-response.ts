import { AvnMintHistory, Royalties } from '../schemas/avn-transaction.schema'

class AvnTransactionMintResponseData {
  unique_external_ref: string
  userId: object
  royalties: Royalties[]
}

export class AvnTransactionMintResponse {
  _id?: object
  request_id?: string
  requestId?: string
  nftId?: string
  type: string
  data: AvnTransactionMintResponseData
  history: AvnMintHistory[]
  createdAt?: Date
  updatedAt?: Date
}
