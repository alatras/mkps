import * as MUUID from 'uuid-mongodb'
import { AuthProvider, Provider } from '../../src/user/schemas/user.schema'

export const mockUser = {
  _id: MUUID.v4(),
  provider: new AuthProvider({
    name: Provider.auth0,
    id: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  avnPubKey: '',
  ethAddresses: [],
  stripeAccountId: '',
  stripeCustomerId: ''
}

export class UserModelMock {
  constructor(private data) {}
  save = jest.fn().mockResolvedValue(this.data)
  static find = jest.fn().mockResolvedValue([mockUser])
  static findOne = jest.fn().mockResolvedValue(mockUser)
  static findOneAndUpdate = jest.fn().mockResolvedValue(mockUser)
  static deleteOne = jest.fn().mockResolvedValue(true)
}
