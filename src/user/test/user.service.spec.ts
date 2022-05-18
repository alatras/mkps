import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { getMockUser, UserMock } from './mocks'
import { Provider, User } from '../schemas/user.schema'
import { UserService } from '../user.service'

describe('NftService', () => {
  let service: UserService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: new UserMock(getMockUser())
        }
      ]
    }).compile()

    service = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new NFT', async () => {
      try {
        const user = await service.createUser({
          provider: { id: 'string', name: Provider.auth0 }
        })

        expect(JSON.stringify(user)).toBe(JSON.stringify(getMockUser()))
      } catch (e) {
        throw e
      }
    })
  })
})
