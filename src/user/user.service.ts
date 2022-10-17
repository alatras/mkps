import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ManagementClient } from 'auth0'
import { Provider, User } from './schemas/user.schema'
import { CreateUserDto } from './dto/user.dto'
import { Request as ExpressRequest } from 'express'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class UserService {
  private configService: ConfigService
  private managementClient: ManagementClient

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    configService: ConfigService,
  ) {
    this.configService = configService
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().lean()
  }

  async findOneByProvider(id: string, name: Provider): Promise<User> {
    return this.userModel
      .findOne({ 'provider.id': id, 'provider.name': name })
      .lean()
  }

  async findOneById(id: string): Promise<User> {
    return this.userModel.findOne({ _id: id }).lean()
  }

  async createUser(createUserDto: CreateUserDto) {
    return await this.userModel.create({
      provider: createUserDto.provider,
      ethAddresses: []
    })
  }

  async updateUser(
    id: string,
    name: Provider,
    body: ExpressRequest['body']
  ): Promise<User> {
    return this.userModel.findOneAndUpdate(
      { 'provider.id': id, 'provider.name': name },
      body,
      { new: true },
    ).lean()
  }

  async updateAuth0Email(
    id: string,
    name: Provider,
    user: User,
    email: string,
  ): Promise<User> {
    const auth0Id = this.getAuth0UserId(user)

    const auth0Client = this.getAuth0Client()
    if (!auth0Client) {
      throw new Error('Cannot get Auth0 ManagementClient')
    }

    const existingAuth0Users = await auth0Client.getUsersByEmail(email)
    if (existingAuth0Users.length) {
      throw new Error('A user with this email exists in Auth0')
    }

    await auth0Client.updateUser({ id: auth0Id }, { email })

    return this.userModel.findOneAndUpdate(
      { 'provider.id': id, 'provider.name': name },
      { email },
      { new: true },
    ).lean()
  }

  private getAuth0UserId = (user: User): string => {
    const { name } = user.provider
    const { id } = user.provider
    return `${name}|${id}`
  }

  private getAuth0Client(): ManagementClient {
    const domain = this.configService.get<string>('AUTH0_CANONICAL_DOMAIN')
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID')
    const clientSecret = this.configService.get<string>('AUTH0_CLIENT_SECRET')
    if (!domain || !clientId || !clientSecret) {
      return null
    }

    if (!this.managementClient) {
      this.managementClient = new ManagementClient({
        domain, clientId, clientSecret,
      })
    }

    return this.managementClient
  }
}
