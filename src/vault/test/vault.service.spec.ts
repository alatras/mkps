import { Test, TestingModule } from '@nestjs/testing'
import { VaultService } from '../services/vault.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import config from '../../config/app.config'

describe('VaultService', () => {
  let service: VaultService

  beforeAll(async () => {
    jest
      .spyOn(VaultService.prototype as any, 'appLogin')
      .mockResolvedValue('token')
    jest
      .spyOn(VaultService.prototype as any, 'get')
      .mockResolvedValue(Promise.resolve({ address: 'address' }))

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule.forRoot({ load: [config] })],
      providers: [VaultService]
    }).compile()

    service = module.get<VaultService>(VaultService)

    jest.spyOn(VaultService.prototype as any, 'appLogin').mockReset()
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
      .spyOn(VaultService.prototype as any, 'appLogin')
      .mockResolvedValueOnce('token')

    jest.spyOn(VaultService.prototype as any, 'get').mockResolvedValueOnce({
      address: 'address'
    })
    ;(VaultService.prototype as any).config = {
      baseUrl: process.env.VAULT_BASE_URL,
      roleId: process.env.VAULT_ROLE_ID,
      secretId: process.env.VAULT_SECRET_ID,
      authority: {
        username: process.env.VAULT_AUTHORITY_USERNAME,
        password: process.env.VAULT_AUTHORITY_PASSWORD
      }
    }

    const address = await (VaultService.prototype as any).setAuthority()

    expect((VaultService.prototype as any).get).toHaveBeenCalledWith(
      'secret/authority',
      'token'
    )
    expect((VaultService.prototype as any).authority.set).toBe(true)
    expect(address).toBe('address')
  })

  it('should call get with the correct URL when calling setRelayer and return a publicKey', async () => {
    ;(VaultService.prototype as any).config = {
      baseUrl: process.env.VAULT_BASE_URL,
      roleId: process.env.VAULT_ROLE_ID,
      secretId: process.env.VAULT_SECRET_ID,
      authority: {
        username: process.env.VAULT_AUTHORITY_USERNAME,
        password: process.env.VAULT_AUTHORITY_PASSWORD
      },
      relayer: {
        username: process.env.VAULT_RELAYER_USERNAME,
        password: process.env.VAULT_RELAYER_PASSWORD
      }
    }

    jest
      .spyOn(VaultService.prototype as any, 'appLogin')
      .mockResolvedValueOnce('token')

    jest.spyOn(VaultService.prototype as any, 'get').mockResolvedValueOnce({
      publicKey: 'publicKey'
    })

    const publicKey = await (VaultService.prototype as any).setRelayer()

    expect((VaultService.prototype as any).get).toHaveBeenCalledWith(
      'secret/relayer',
      'token'
    )
    expect((VaultService.prototype as any).relayer.set).toBe(true)
    expect(publicKey).toBe('publicKey')
  })

  it('should be able to create a new user', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ data: { publicKey: 'publicKey' } })
    jest
      .spyOn(VaultService.prototype as any, 'appLogin')
      .mockResolvedValueOnce('token')

    jest
      .spyOn(VaultService.prototype as any, 'get')
      .mockResolvedValueOnce(undefined)

    const publicKey = await service.createNewUser('username')
    expect(publicKey).toBe('publicKey')
    expect((VaultService.prototype as any).post).toHaveBeenCalledWith(
      'avn-vault/user/username',
      {
        username: 'username'
      }
    )
  })

  it('should call post with the correct URL when calling appLogin', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce('token')

    await service.appLogin('mockRole', 'mockSecret')

    expect((VaultService.prototype as any).post).toHaveBeenCalledWith(
      'auth/approle/login',
      {
        role_id: 'mockRole',
        secret_id: 'mockSecret'
      }
    )
  })

  it('should call post with the correct URL when calling userPassLogin', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce('token')

    await (VaultService.prototype as any).userPassLogin('username', 'password')
    expect((VaultService.prototype as any).post).toHaveBeenCalledWith(
      'auth/userpass/login/username',
      {
        password: 'password'
      }
    )
  })

  it('should sign the message with the correct signature when calling authoritySign', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'userPassLogin')
      .mockResolvedValueOnce('token')
    ;(VaultService.prototype as any).authority = {
      username: 'xxxx',
      password: 'xxxx',
      set: true
    }

    jest
      .spyOn(VaultService.prototype as any, 'post')
      .mockResolvedValueOnce({ auth: { client_token: 'signature' } })

    expect(await (VaultService.prototype as any).authoritySign('data')).toEqual(
      'signature'
    )
  })

  it('should return the correct seed when calling getUserSeed', async () => {
    jest
      .spyOn(VaultService.prototype as any, 'appLogin')
      .mockResolvedValueOnce('token')

    jest.spyOn(VaultService.prototype as any, 'get').mockResolvedValueOnce({
      seed: 'seed'
    })

    const seed = await (VaultService.prototype as any).getUserSeed('username')

    expect((VaultService.prototype as any).get).toHaveBeenCalledWith(
      `avn-vault/user/username`,
      'token'
    )

    expect(seed).toEqual('seed')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})
