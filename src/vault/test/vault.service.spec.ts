import { Test, TestingModule } from '@nestjs/testing'
import { VaultService } from '../services/vault.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import config from '../../config/app.config'
import { LogModule } from '../../log/log.module'

describe('VaultService', () => {
  let service: VaultService

  beforeAll(async () => {
    jest
      .spyOn(VaultService.prototype as any, 'getAppLoginToken')
      .mockResolvedValue('token')
    jest
      .spyOn(VaultService.prototype as any, 'get')
      .mockResolvedValue(Promise.resolve({ address: 'address' }))

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LogModule,
        HttpModule,
        ConfigModule.forRoot({ load: [config] })
      ],
      providers: [VaultService]
    }).compile()

    ;(VaultService.prototype as any).config = {
      baseUrl: process.env.VAULT_URL,
      roleId: process.env.VAULT_APP_ROLE_ID,
      secretId: process.env.VAULT_APP_SECRET_ID,
      authority: {
        username: process.env.VAULT_AUTHORITY_USERNAME,
        password: process.env.VAULT_AUTHORITY_PASSWORD
      }
    }
    ;(VaultService.prototype as any).loginToken = {
      token: 'token',
      validUntil: 0
    }

    service = module.get<VaultService>(VaultService)

    jest.spyOn(VaultService.prototype as any, 'getAppLoginToken').mockReset()
    jest.spyOn(VaultService.prototype as any, 'get').mockReset()

    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ publicKey: 'publicKey' })
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should call get with the correct URL when calling setAuthority and return an address', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'getAppLoginToken')
      .mockResolvedValueOnce('token')

    jest.spyOn(VaultService.prototype as any, 'get').mockResolvedValueOnce({
      address: 'address'
    })

    const address = await (VaultService.prototype as any).setAuthority()

    expect((VaultService.prototype as any).get).toHaveBeenCalledWith(
      'secret/authority',
      'token'
    )
    expect((VaultService.prototype as any).authority.set).toBe(true)
    expect(address).toBe('address')
  })

  it('should be able to create a new user', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ publicKey: 'publicKey' })

    jest
      .spyOn(VaultService.prototype as any, 'getAppLoginToken')
      .mockResolvedValueOnce('token')

    jest
      .spyOn(VaultService.prototype as any, 'get')
      .mockResolvedValueOnce(undefined)

    const publicKey = await service.getUserKeyOrCreateNewUser('username')
    expect(publicKey).toBe('publicKey')
    expect((VaultService.prototype as any).post).toHaveBeenCalledWith(
      'avn-vault/user/username',
      {
        username: 'username'
      },
      'token'
    )
  })

  it('should call post with the correct URL when calling getAppLoginToken', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ auth: { client_token: 'clientToken' } })

    const token = await service.getAppLoginToken()

    expect(token).toBe('clientToken')
    expect((VaultService.prototype as any).post).toHaveBeenCalledWith(
      'auth/approle/login',
      {
        role_id: process.env.VAULT_APP_ROLE_ID,
        secret_id: process.env.VAULT_APP_SECRET_ID
      },
      null
    )
  })

  it('should call post with the correct URL when calling userPassLogin', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce('userPassLoginToken')

    const userPassLoginToken = await (
      VaultService.prototype as any
    ).getUserPassLoginToken('username', 'password')
    expect(userPassLoginToken).toBe('userPassLoginToken')
    expect((VaultService.prototype as any).post).toHaveBeenCalledWith(
      'auth/userpass/login/username',
      {
        password: 'password'
      },
      null
    )
  })

  it('should sign the message with the correct signature when calling authoritySign', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'getUserPassLoginToken')
      .mockResolvedValueOnce('token')
    ;(VaultService.prototype as any).authority = {
      username: process.env.VAULT_AUTHORITY_USERNAME,
      password: process.env.VAULT_AUTHORITY_PASSWORD,
      set: true
    }

    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ signature: 'authoritySignature' })

    expect(await (VaultService.prototype as any).authoritySign('data')).toEqual(
      'authoritySignature'
    )
  })

  it('should sign the message with the correct signature when calling userSign', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'getAppLoginToken')
      .mockResolvedValueOnce('token')

    jest.spyOn(VaultService.prototype as any, 'get').mockResolvedValueOnce({
      address: 'address'
    })

    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ signature: 'userSignature' })

    expect(await (VaultService.prototype as any).userSign('data')).toEqual(
      'userSignature'
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
