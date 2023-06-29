import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
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
  private vaultUrl: string

  private readonly EXPIRY = 1000 * 60 * 10 //10 min

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    // create VaultOptions object
    const vaultConfig = this.configService.get<VaultConfig>('app.vault')

    if (!vaultConfig) {
      const message = 'vaultConfig is undefined'
      this.logger.error(`[constructor] ${message}`)
      throw new NotFoundException(message)
    }

    // loop through vaultConfig object and check if any values are undefined or null - if so, throw error
    for (const [key, value] of Object.entries(vaultConfig)) {
      if (!value) {
        const message = `${key} is undefined`
        this.logger.error(`[constructor] ${message}`)
        throw new NotFoundException(message)
      }
    }

    this.config = vaultConfig

    this.loginToken = { token: null, validUntil: 0 }

    // Avoiding double slash in URL
    this.vaultUrl = this.config.baseUrl
    if (this.config.baseUrl.endsWith('/')) {
      this.vaultUrl = this.config.baseUrl.slice(0, -1)
    }

    this.logger.debug(`[constructor] Vault URL: ${this.vaultUrl}`)
  }

  /**
   * This method gets the data from the specified URL using the provided Vault token.
   * @param url - The URL to fetch the data from.
   * @param token - The Vault token to authenticate the request.
   * @returns The fetched data.
   */
  private async get(url: string, token: string): Promise<any> {
    try {
      this.logger.debug(`get data for URL: ${url}`)
      const res = await firstValueFrom(
        this.httpService.get(`${this.vaultUrl}/${url}`, {
          headers: {
            'X-Vault-Token': token
          }
        })
      ).catch(err => {
        this.logger.error(`get data error: ${err.message}`)
        throw err
      })

      return res?.data?.data
    } catch (error) {
      this.logger.error(`get data error: ${error.message}`)

      if (
        error.response?.status === 404 ||
        error.response?.data?.errors?.[0].includes('Error reading user')
      ) {
        this.logger.debug(
          `[get] ${error.response.data.errors[0]}. Returning null.`
        )
        return null
      } else {
        const message = `Failed to get: URL: ${url}. Error: ${error.toString()}. Token: ${token}.`
        this.logger.error(`[get] ${message}`)
        throw new InternalServerErrorException(message)
      }
    }
  }

  /**
   * This method posts data to the specified URL with the provided headers.
   * @param url - The URL to post the data to.
   * @param data - The data to be posted.
   * @param headers - Additional headers for the request.
   * @returns The response data from the post request.
   */
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
        this.httpService.post(`${this.vaultUrl}/${url}`, data, {
          headers
        })
      ).catch(err => {
        this.logger.error(`post data error: ${err.toString()}`)
        throw err
      })

      return token ? response.data.data : response.data
    } catch (err) {
      const message = `Failed to post: ${err.toString()}`
      this.logger.error(`[post] ${message}`)
      throw new InternalServerErrorException(message)
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

      if (!this.loginToken?.token || this.loginToken?.validUntil < now) {
        this.logger.debug(
          `token ${this.loginToken.token} has expired on ${this.loginToken.validUntil}. Refreshing...`
        )

        const response = await this.post(url, data, null)
        this.loginToken.token = response.auth.client_token
        this.loginToken.validUntil = now + this.EXPIRY
      }
      return this.loginToken.token
    } catch (err) {
      const message = `app login token data error: ${err.toString()}`
      this.logger.error(`[getAppLoginToken] ${message}`)
      throw new InternalServerErrorException(message)
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
      const message = `user pass login token data error: ${err.toString()}`
      this.logger.error(`[getUserPassLoginToken] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }

  private async setAuthority(): Promise<void> {
    const token = await this.getAppLoginToken()

    const res = await this.get(`secret/authority`, token)

    if (!res) {
      throw new InternalServerErrorException(
        'VaultService.setAuthority: Authority does not exist'
      )
    }

    this.authority = {
      username: this.config.authority.username,
      password: this.config.authority.password,
      set: true
    }

    return res.address
  }

  /**
   * This method retries the provided operation a specified number of times with a delay between each attempt.
   * @param operation - The operation to be performed.
   * @param retries - The number of times to retry the operation.
   * @param delay - The delay between each retry attempt.
   * @returns The result of the operation.
   * @throws The error from the operation if it fails after all retries.
   */
  private retry = async (
    operation: () => Promise<any>,
    retries: number,
    delay: number
  ): Promise<any> => {
    try {
      return await operation()
    } catch (error) {
      if (retries <= 0) {
        this.logger.error(`Failed after all retries: ${JSON.stringify(error)}`)
        throw error
      }

      this.logger.warn(`Retrying after failure: ${JSON.stringify(error)}`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return this.retry(operation, retries - 1, delay)
    }
  }

  /**
   * This method gets the user key from Vault or creates a new user if one does not exist.
   * It retries the operation a specified number of times with a delay between each attempt.
   * @param username - The username of the user.
   * @returns The user key.
   */
  async getUserKeyOrCreateNewUser(username: string): Promise<string> {
    const token = await this.getAppLoginToken()

    const userUrl = `avn-vault/user/${username}`

    // Check if user exists
    try {
      const existingUser = await this.retry(
        () => this.get(userUrl, token),
        3,
        500
      )
      if (existingUser) {
        return existingUser.publicKey
      }
    } catch (error) {
      const message = `Failed to get user from Vault: ${JSON.stringify(
        error
      )}. Url: ${userUrl}`
      this.logger.error(`[getUserKeyOrCreateNewUser] ${message}`)
      throw new InternalServerErrorException(message)
    }

    // Create new user
    try {
      const res = await this.retry(
        () => this.post(userUrl, { username }, token),
        3,
        500
      )
      return res.publicKey
    } catch (error) {
      const message = `Failed to create a user with Vault: ${JSON.stringify(
        error
      )}. Url: ${userUrl}`
      this.logger.error(`[getUserKeyOrCreateNewUser] ${message}`)
      throw new InternalServerErrorException(message)
    }
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

      const signRes = await this.post(
        `avn-vault/authority/sign`,
        { message },
        token
      )

      return signRes?.signature
    } catch (error) {
      const message = `error in authority signing:  ${error.toString()}`
      this.logger.error(`[authoritySign] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }

  async userSign(message: string, username: string): Promise<string> {
    try {
      const token = await this.getAppLoginToken()

      const url = 'avn-vault/user/' + username
      const res = await this.get(url, token)

      if (res === '') {
        throw new InternalServerErrorException(
          `User ${username} does not exist in vault`
        )
      }

      const data = { name: username, message: message }

      return (await this.post(url + '/sign', data, token)).signature
    } catch (error) {
      const message = `error in user signing:  ${error.toString()}`
      this.logger.error(`[userSign] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }
}
