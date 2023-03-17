import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { LogService } from '../../log/log.service'

interface VaultConfig {
  baseUrl: string
  roleId: string
  secretId: string
  authority: {
    username: string
    password: string
  }
  relayer: { username: string; password: string }
}

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)
  private readonly config: VaultConfig
  private authority: { username: string; password: string; set: boolean } = {
    username: '',
    password: '',
    set: false
  }
  private relayer: { username: string; password: string; set: boolean } = {
    username: '',
    password: '',
    set: false
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private logService: LogService
  ) {
    // create VaultOptions object
    const vaultConfig = this.configService.get<VaultConfig>('app.vault')

    // loop through vaultConfig object and check if any values are undefined or null - if so, throw error
    if (!vaultConfig) {
      throw new Error('VaultService.constructor: vaultConfig is undefined')
    }

    for (const [key, value] of Object.entries(vaultConfig)) {
      if (value === undefined || value === null || value === '') {
        throw new Error(`VaultService.constructor: ${key} is undefined`)
      }
    }

    this.config = vaultConfig
    // this.setAuthority().then(r =>
    //   this.logger.log(`Authority set - address: ${r}`)
    // )
    //
    // this.setRelayer().then(r =>
    //   this.logger.log(`Relayer set - publicKey: ${r}`)
    // )
  }

  private async get(url: string, token: string): Promise<any> {
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${this.config.baseUrl}/${url}`, {
          headers: {
            'X-Vault-Token': token
          }
        })
      )

      return res.data.data
    } catch (error) {
      if (error.response) {
        if (
          error.response.status === 404 ||
          error.response.data.errors[0].includes('Error reading user')
        ) {
          return null
        } else {
          throw new Error(`VaultService.get: ${error.response.data.errors}`)
        }
      } else {
        throw new Error(`VaultService.get: ${error.message}`)
      }
    }
  }

  private async post<T>(
    url: string,
    data: T,
    headers?: Record<string, string>
  ): Promise<string | any> {
    const defaultHeaders = { 'Content-Type': 'application/json' }
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.config.baseUrl}/${url}`, data, {
          ...defaultHeaders,
          headers
        })
      )

      return response.data
    } catch (e) {
      if (e.response) {
        throw new Error(`VaultService.post: ${e.response.data.errors}`)
      } else {
        throw new Error(`VaultService.post: ${e.message}`)
      }
    }
  }

  async appLogin(roleId: string, secretId: string): Promise<string> {
    const res = await this.post(`auth/approle/login`, {
      role_id: roleId,
      secret_id: secretId
    })

    return res.data
  }

  private async userPassLogin(
    username: string,
    password: string
  ): Promise<string> {
    const res = await this.post(`auth/userpass/login/${username}`, {
      password
    })

    return res.data
  }

  private async setAuthority(): Promise<void> {
    const token = await this.appLogin(this.config.roleId, this.config.secretId)

    const res = await this.get(`secret/authority`, token)

    if (!res) {
      throw new Error('VaultService.setAuthority: Authority does not exist')
    }

    this.authority = {
      username: this.config.authority.username,
      password: this.config.authority.password,
      set: true
    }

    return res.address
  }

  private async setRelayer(): Promise<string> {
    const token = await this.appLogin(this.config.roleId, this.config.secretId)

    const res = await this.get(`secret/relayer`, token)
    if (!res) {
      throw new Error('VaultService.setRelayer: Relayer does not exist')
    }

    this.relayer = {
      username: this.config.relayer.username,
      password: this.config.relayer.password,
      set: true
    }

    return res.publicKey
  }

  // create createNewUser function - takes username, calls appLogin, calls get to check if user exists, if not, calls post to create user
  async createNewUser(username: string): Promise<string> {
    const token = await this.appLogin(this.config.roleId, this.config.secretId)

    const userUrl = `avn-vault/user/${username}`

    const existingUser = await this.get(userUrl, token)

    if (existingUser) {
      return existingUser.publicKey
    }

    const res = await this.post(userUrl, {
      username
    })

    return res.data.publicKey
  }

  private async authoritySign(message: string): Promise<string> {
    if (!this.authority.set) {
      throw new Error('VaultService.authoritySign: Authority not set')
    }

    try {
      const token = await this.userPassLogin(
        this.authority.username,
        this.authority.password
      )

      const res = await this.post(
        `avn-vault/authority/sign`,
        {
          message
        },
        {
          'X-Vault-Token': token,
          'X-Vault-Request': 'true'
        }
      )

      return res.auth.client_token
    } catch (error) {
      throw new Error(`VaultService.authoritySign: ${error.message}`)
    }
  }

  // In the case of the NFT Marketplace, the username is the Provider ID
  private async getUserSeed(username: string): Promise<string> {
    const token = await this.appLogin(this.config.roleId, this.config.secretId)
    const existingUser = await this.get(`avn-vault/user/${username}`, token)

    if (!existingUser) {
      throw new Error('VaultService.getUserSeed: User does not exist')
    }

    return existingUser.seed
  }
}
