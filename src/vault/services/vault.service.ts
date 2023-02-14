import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { logger } from 'ethers'

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
    private readonly configService: ConfigService
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

    // call setAuthority function
    this.setAuthority().then(r => logger.info(`Authority set - address: ${r}`))

    // call setRelayer function
    this.setRelayer().then(r => logger.info(`Relayer set - publicKey: ${r}`))
  }

  private async get(url: string, token: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.httpService.get(`${this.config.baseUrl}/${url}`, {
          headers: {
            'X-Vault-Token': token
          }
        })
      ).then(response => response.data.data)
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

  private async post(
    url: string,
    data: any,
    token?: string
  ): Promise<string | any> {
    const headers = { 'Content-Type': 'application/json' }

    if (token) {
      headers['X-Vault-Token'] = token
      headers['X-Vault-Request'] = 'true'
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.config.baseUrl}/${url}`, data, {
          headers
        })
      ).then(response => response.data)

      return token ? response.auth.client_token : response.data
    } catch (e) {
      if (e.response) {
        throw new Error(`VaultService.post: ${e.response.data.errors}`)
      } else {
        throw new Error(`VaultService.post: ${e.message}`)
      }
    }
  }

  async appLogin(roleId: string, secretId: string): Promise<string> {
    return await this.post(`auth/approle/login`, {
      role_id: roleId,
      secret_id: secretId
    })
  }

  private async userPassLogin(
    username: string,
    password: string
  ): Promise<string> {
    return await this.post(`auth/userpass/login/${username}`, {
      password
    })
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

    return await this.post(userUrl, {
      username
    }).then(r => r.publicKey)
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
        token
      )

      return res.signature
    } catch (error) {
      throw new Error(`VaultService.authoritySign: ${error.message}`)
    }
  }

  private async getRelayerSeed(): Promise<string> {
    if (!this.relayer.set) {
      throw new Error('VaultService.getRelayerSeed: Relayer not set')
    }
    const token = await this.appLogin(this.config.roleId, this.config.secretId)

    const res = await this.get(
      `avn-vault/relayer/${this.relayer.username}`,
      token
    )

    if (!res) {
      throw new Error('VaultService.getRelayerSeed: Relayer does not exist')
    }

    return res.seed
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
