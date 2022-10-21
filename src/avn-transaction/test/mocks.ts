import * as MUUID from 'uuid-mongodb'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { AvnTransaction } from '../schemas/avn-transaction.schema'
import { Types } from 'mongoose'

export const getAvnTransaction = (): AvnTransaction => {
  return {
    _id: new Types.ObjectId('218f9288-48e3-11ed-b878-0242ac120002'),
    request_id: '218f9288-48e3-11ed-b878-0242ac120002',
    type: AvnTransactionType.AvnCancelFiatSale,
    data: {
      unique_external_ref: '',
      userId: MUUID.from('218f9288-48e3-11ed-b878-0242ac120002'),
      royalties: [
        {
          recipient_t1_address: '',
          rate: {
            parts_per_million: 10
          }
        }
      ]
    },
    state: AvnTransactionState.AVN_REJECTED,
    history: []
  }
}
