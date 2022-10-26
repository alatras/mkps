import * as MUUID from 'uuid-mongodb'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { AvnTransaction } from '../schemas/avn-transaction.schema'
import { Types } from 'mongoose'

export const getAvnTransaction = (
  filter?: (value: AvnTransaction) => unknown
): AvnTransaction => {
  if (!filter) {
    return MOCK_AVN_TRANSACTIONS[0]
  }

  return MOCK_AVN_TRANSACTIONS.filter(filter)[0]
}

const MOCK_AVN_TRANSACTIONS = [
  {
    _id: new Types.ObjectId(),
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
  },
  {
    _id: new Types.ObjectId(),
    request_id: '218f9288-48e3-11ed-b878-0242ac120002',
    type: AvnTransactionType.MintSingleNft,
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
    state: AvnTransactionState.PROCESSING_COMPLETE,
    history: [
      {
        state: AvnTransactionState.PROCESSING_COMPLETE,
        timestamp: 12312312312,
        operation_data: {
          nftId:
            '40248750905114323404425156994387097914659983526989989038907201038418990564614',
          ownerAvnAddress: '5CcEuAgw9PgyTgrJApEukJfQqrJuywDVZfrPXjZj1yHU84AA',
          ethereumContractAddress: '0x5653e2fe79ec73df19a559131f4c11e0d153e4d5'
        }
      }
    ]
  }
]
