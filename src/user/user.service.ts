import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Provider, User } from './schemas/user.schema'
import { CreateUserDto } from './dto/user.dto'

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async findAll(): Promise<User[]> {
    return this.userModel.find().lean()
  }

  async findOneByProvider(id: string, name: Provider): Promise<User> {
    return this.userModel
      .findOne({ 'provider.id': id, 'provider.name': name })
      .lean()
  }

  async findOneById(id: string): Promise<User> {
    return this.userModel
      .findOne({ _id: id })
      .lean()
  }

  async createUser(createUserDto: CreateUserDto) {
    return await this.userModel.create({
      provider: createUserDto.provider,
      ethAddresses: []
    })
  }
}
