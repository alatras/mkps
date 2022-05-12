import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  AuthProvider,
  Provider,
  User,
  UserDocument
} from './schemas/user.schema'

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto)
    return createdUser.save()
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().lean()
  }

  async findOneByProvider(id: string, name: Provider): Promise<User> {
    return this.userModel
      .findOne({ 'provider.id': id, 'provider.name': name })
      .lean()
  }

  async createUser(provider: Pick<AuthProvider, 'id' | 'name'>) {
    return this.userModel.create({
      provider: { ...provider },
      ethAddresses: [],
      createdAt: new Date()
    })
  }
}
