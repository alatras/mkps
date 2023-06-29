import { NotificationPreferences, Provider, User } from '../schemas/user.schema'
import * as MUUID from 'uuid-mongodb'

export const getMockUser = (): User => {
  return {
    _id: MUUID.from('6ff0f46c-5e04-4801-8330-cb9df0f17029'),
    avnPubKey: 'string',
    stripeCustomerId: 'string',
    stripeAccountId: 'string',
    provider: {
      id: 'string',
      name: Provider.auth0,
      createdAt: new Date('2022-05-18T13:23:39.468Z'),
      updatedAt: new Date('2022-05-18T13:23:39.468Z')
    },
    ethAddresses: [],
    notificationPreferences: new NotificationPreferences(),
    createdAt: new Date('2022-05-18T13:23:39.468Z'),
    updatedAt: new Date('2022-05-18T13:23:39.468Z')
  }
}

export class UserMock {
  constructor(private data) {}
  new = jest.fn()
  create = jest.fn().mockResolvedValue(this.data)
  save = jest.fn().mockResolvedValue(this.data)
  static find = jest.fn().mockResolvedValue([getMockUser()])
  static findOne = jest.fn().mockResolvedValue(getMockUser())
  static findOneAndUpdate = jest.fn().mockResolvedValue(getMockUser())
  static deleteOne = jest.fn().mockResolvedValue(true)
}
