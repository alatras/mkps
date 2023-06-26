import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

interface VaultConfig {
  baseUrl: string
  roleId: string
  secretId: string
  authority: {
    username: string
    password: string
  }
}

interface LoginToken {
  token: string
  validUntil: number
}

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)
  private readonly config: VaultConfig
  private readonly loginToken: LoginToken
  private authority: { username: string; password: string; set: boolean } = {
    username: '',
    password: '',
    set: false
  }

  private readonly EXPIRY = 1000 * 60 * 10 //10 min

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    // create VaultOptions object
    const vaultConfig = this.configService.get<VaultConfig>('app.vault')

    // loop through vaultConfig object and check if any values are undefined or null - if so, throw error
    if (!vaultConfig) {
      this.logger.error('constructor: vaultConfig is undefined')
      throw new Error('VaultService.constructor: vaultConfig is undefined')
    }

    for (const [key, value] of Object.entries(vaultConfig)) {
      if (!value) {
        throw new Error(`VaultService.constructor: ${key} is undefined`)
      }
    }

    this.config = vaultConfig
  }

  private async get(url: string, token: string): Promise<any> {
    try {
      this.logger.debug(`get data for URL: ${url}`)
      const res = await firstValueFrom(
        this.httpService.get(`${this.config.baseUrl}/${url}`, {
          headers: {
            'X-Vault-Token': token
          }
        })
      )

      return res.data.data
    } catch (error) {
      this.logger.error(`get data error: ${error.message}`)

      if (
        error.response?.status === 404 ||
        error.response?.data?.errors?.[0].includes('Error reading user')
      ) {
        return null
      } else {
        throw new Error(`VaultService.get: ${JSON.stringify(error)}`)
      }
    }
  }

  private async post<T>(
    url: string,
    data: T,
    token?: string
  ): Promise<string | any> {
    const headers = { 'Content-Type': 'application/json' }

    if (token) {
      headers['X-Vault-Request'] = 'true'
      headers['X-Vault-Token'] = token!
    }

    try {
      this.logger.debug(`post data for URL: ${url}`)
      const response = await firstValueFrom(
        this.httpService.post(`${this.config.baseUrl}/${url}`, data, {
          headers
        })
      )

      return response.data.data
    } catch (err) {
      this.logger.error(`post data error: ${err.toString()}`)
      throw new Error(`VaultService.post: ${err.toString()}`)
    }
  }

  async getAppLoginToken(): Promise<string> {
    const url = 'auth/approle/login'
    const data = {
      role_id: this.config.roleId,
      secret_id: this.config.secretId
    }

    try {
      const now = Date.now()
      if (!this.loginToken.token || this.loginToken.validUntil < now) {
        this.logger.debug(
          `token ${this.loginToken.token} has expired on ${this.loginToken.validUntil}. Refreshing...`
        )

        const response = await this.post(url, data, null)
        this.loginToken.token = response.auth.client_token
        this.loginToken.validUntil = now + this.EXPIRY
      }
      return this.loginToken.token
    } catch (err) {
      this.logger.error(`app login token data error: ${err.toString()}`)
      throw new Error(`VaultService.getAppLoginToken: ${err.toString()}`)
    }
  }

  private async getUserPassLoginToken(
    username: string,
    password: string
  ): Promise<string> {
    const url = `auth/userpass/login/${username}`
    const data = { password }

    try {
      return await this.post(url, data, null)
    } catch (err) {
      this.logger.error(`user pass login data error: ${err.toString()}`)
      throw err
    }
  }

  private async setAuthority(): Promise<void> {
    const token = await this.getAppLoginToken()

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

  async createNewUser(username: string): Promise<string> {
    const token = await this.getAppLoginToken()

    const userUrl = `avn-vault/user/${username}`

    const existingUser = await this.get(userUrl, token)

    if (existingUser) {
      return existingUser.publicKey
    }

    const res = await this.post(userUrl, { username }, token)

    return res.publicKey
  }

  async authoritySign(message: string): Promise<string> {
    if (!this.authority.set) {
      throw new Error('VaultService.authoritySign: Authority not set')
    }

    try {
      const token = await this.getUserPassLoginToken(
        this.authority.username,
        this.authority.password
      )

      return (await this.post(`avn-vault/authority/sign`, { message }, token))
        .signature
    } catch (error) {
      throw new Error(`VaultService.authoritySign: ${error.message}`)
    }
  }

  async userSign(message: string, username: string): Promise<string> {
    const token = await this.getAppLoginToken()
    const url = 'avn-vault/user/' + username
    const res = await this.get(url, token)
    if (res === '') {
      throw new Error(`User ${username} does not exist in vault`)
    }

    const data = { name: username, message: message }
    return (await this.post(url + '/sign', data, token)).signature
  }
}
