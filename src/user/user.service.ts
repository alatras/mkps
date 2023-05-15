import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Provider, User } from './schemas/user.schema'
import { CreateUserDto } from './dto/user.dto'
import { Request as ExpressRequest } from 'express'
import { MUUID } from 'uuid-mongodb'
import { Auth0Service } from './auth0.service'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

  constructor(
    private readonly auth0Service: Auth0Service,
    @InjectModel(User.name) private userModel: Model<User>
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().lean()
  }

  async findOneByProvider(id: string, name: Provider): Promise<User> {
    return this.userModel
      .findOne({ 'provider.id': id, 'provider.name': name })
      .lean()
  }

  async findOneById(_id: MUUID): Promise<User> {
    return this.userModel.findOne({ _id }).lean()
  }

  async createUser(createUserDto: CreateUserDto) {
    return await this.userModel.create({
      provider: createUserDto.provider,
      ethAddresses: []
    })
  }

  async updateUserByProvider(
    id: string,
    name: Provider,
    body: ExpressRequest['body']
  ): Promise<User> {
    return this.userModel
      .findOneAndUpdate({ 'provider.id': id, 'provider.name': name }, body, {
        new: true
      })
      .lean()
  }

  async updateAuth0Email(
    id: string,
    name: Provider,
    user: User,
    email: string
  ): Promise<User> {
    this.logger.debug(`Updating Auth0 email for user ${id} to ${email}`)

    const auth0Id = this.auth0Service.getAuth0UserId(user)

    const auth0Client = this.auth0Service.getAuth0Client()
    if (!auth0Client) {
      throw new Error('Cannot get Auth0 ManagementClient')
    }

    const existingAuth0Users = await auth0Client.getUsersByEmail(email)
    if (existingAuth0Users.length) {
      throw new Error('A user with this email exists in Auth0')
    }

    await auth0Client.updateUser({ id: auth0Id }, { email })

    return this.userModel
      .findOneAndUpdate(
        { 'provider.id': id, 'provider.name': name },
        { email },
        { new: true }
      )
      .lean()
  }

  async updateUserById(
    _id: MUUID,
    body: ExpressRequest['body']
  ): Promise<User> {
    return this.userModel.findOneAndUpdate({ _id }, body, { new: true }).lean()
  }
}
