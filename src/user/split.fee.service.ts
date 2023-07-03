import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

interface SplitFeeConfig {
  baseUrl: string
  username: string
  password: string
  payerId: string
}

@Injectable()
export class SplitFeeService {
  private readonly logger = new Logger(SplitFeeService.name)
  private readonly config: SplitFeeConfig

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    const SplitFeeConfig =
      this.configService.get<SplitFeeConfig>('app.splitFee')

    if (!SplitFeeConfig) {
      const message = 'SplitFeeConfig is undefined'
      this.logger.error(`[constructor] ${message}`)
      throw new NotFoundException(message)
    }

    // loop through the config object and check if any values are undefined or null - if so, throw error
    for (const [key, value] of Object.entries(SplitFeeConfig)) {
      if (!value) {
        const message = `${key} is undefined`
        this.logger.error(`[constructor] ${message}`)
        throw new NotFoundException(message)
      }
    }

    this.config = SplitFeeConfig
    if (this.config.baseUrl.endsWith('/')) {
      this.config.baseUrl = this.config.baseUrl.slice(0, -1)
    }
  }

  /**
   * Registers a new user as a split fee user
   * @param userPublicKey avn public key of new user
   * @param description Description for the user
   */
  async registerAsSplitFeeUser(userPublicKey: string, description: string) {
    try {
      if (!userPublicKey) {
        throw new BadRequestException('userPublicKey is a mandatory field')
      }

      // TODO: cache the token
      const accessToken = await this.getAccessToken()
      if (
        (await this.splitFeeUserExists(accessToken, userPublicKey)) === false
      ) {
        await this.saveUser(accessToken, userPublicKey, description)
      }
    } catch (err) {
      this.logger.error(
        `[registerAsSplitFeeUser] Error registering a split fee user ${userPublicKey}, description: ${description}. ${err.toString()}`
      )
      throw err
    }
  }

  /**
   * Gets an access token from the split fee admin portal
   * @returns The access token for the admin portal
   */
  private async getAccessToken(): Promise<string> {
    try {
      const headers = { 'Content-Type': 'application/json' }
      const data = {
        username: this.config.username,
        password: this.config.password
      }

      const res = await firstValueFrom(
        this.httpService.post(`${this.config.baseUrl}/payer-token`, data, {
          headers
        })
      ).catch(err => {
        this.logger.error(`get split fee access token error: ${err.toString()}`)
        throw err
      })

      return res?.data?.data
    } catch (err) {
      this.logger.error(
        `[getAccessToken] Error getting access token from split fee admin : ${err.toString()}`
      )
      throw err
    }
  }

  /**
   * Checks if a user is already registered as a split fee user
   * @param accessToken The access token used to authenticate this request
   * @param userPublicKey avn public key of new user
   * @returns True if user exists, and false if it doesn't
   */
  private async splitFeeUserExists(
    accessToken: string,
    userPublicKey: string
  ): Promise<boolean> {
    const headers = { 'Content-Type': 'application/json', accessToken }
    const res = await firstValueFrom(
      this.httpService.get(
        `${this.config.baseUrl}/payerAdmin/users/${this.config.payerId}?search=${userPublicKey}`,
        { headers }
      )
    ).catch(err => {
      this.logger.error(`[get split fee access token] error: ${err.message}`)
      throw err
    })

    return res?.data?.count > 0
  }

  /**
   * Saves the new user as a split fee user
   * @param accessToken The access token used to authenticate this request
   * @param userPublicKey avn public key of new user
   * @param description Description for the user
   */
  private async saveUser(
    accessToken: string,
    userPublicKey: string,
    description: string
  ) {
    try {
      const headers = { 'Content-Type': 'application/json', accessToken }
      const data = {
        payerId: this.config.payerId,
        publicKey: userPublicKey,
        description: description
      }

      await firstValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/payerAdmin/users/add`,
          data,
          {
            headers
          }
        )
      ).catch(err => {
        this.logger.error(`[save user] error: ${err.toString()}`)
        throw err
      })
    } catch (err) {
      this.logger.error(
        `[saveUser] Error saving user public key in admin portal : ${err.toString()}`
      )
      throw err
    }
  }
}
