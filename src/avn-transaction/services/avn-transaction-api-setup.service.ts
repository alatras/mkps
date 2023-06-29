import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Lock, ResourceLockedError } from 'redlock'
import { User } from '../../user/schemas/user.schema'
import { AvnApi } from '../schemas/avn-api'
import { VaultService } from '../../vault/services/vault.service'
import { RedisService } from '../../common/redis/redis.service'

@Injectable()
export class AvnTransactionApiSetupService {
  private _avnApi: AvnApi
  private readonly logger = new Logger(AvnTransactionApiSetupService.name)
  private currentAvnUser: User
  private currentRedLock: Lock
  private user: User

  constructor(
    private configService: ConfigService,
    private vaultService: VaultService,
    private redisService: RedisService
  ) {
    this.configService = configService
  }

  /**
   * Get the avnApi instance
   * @param user
   */
  async initializeAvnApiInstance(user: User): Promise<AvnApi> {
    this.user = user

    // Lock the avnApi instance for this user
    this.currentRedLock = await this.lockAvnApiInstance()

    try {
      if (!this._avnApi) {
        const api = await this.buildTheApi(user)
        this._avnApi = api
        this.currentAvnUser = user
        await api.init()
      } else {
        this.currentAvnUser = user
        await this.setAvnApiSigner(user)
      }
      return this._avnApi
    } catch (error) {
      const message = `Failed to initialize avnApi. Error: ${error}`
      this.logger.debug(message)
      this.unlockAvnApiInstance()
      throw new InternalServerErrorException(message)
    }
  }

  /**
   * Setup remote signer
   */
  private async remoteSign(message: string): Promise<string> {
    const signerAddressOrPubKey = this._avnApi.signer().address

    // !Check if the signerAddress is who we expect it to be before signing
    if (
      this.currentAvnUser.avnPubKey.toLowerCase() !==
        signerAddressOrPubKey.toLowerCase() &&
      this.currentAvnUser.avnAddress !== signerAddressOrPubKey
    ) {
      const message = `Invalid user ${signerAddressOrPubKey} found when attempting to sign avn operation.`
      this.logger.debug(message)
      this.unlockAvnApiInstance()
      throw new InternalServerErrorException(message)
    }

    const signerVaultUserName = this.user.provider.id

    return await this.vaultService.userSign(message, signerVaultUserName)
  }

  /**
   * Set a new signer in Avn Api. This will modify the avnApi instance
   */
  private async setAvnApiSigner(user: User) {
    try {
      await this._avnApi.setSigner({
        sign: async (encodedMessage: string) => {
          return await this.remoteSign(encodedMessage)
        },
        address: user.avnAddress,
        publicKey: user.avnPubKey
      })
    } catch (error) {
      const message = `Failed to set avnApi signer. Error: ${error}`
      this.logger.debug(message)
      this.unlockAvnApiInstance()
      throw new InternalServerErrorException(message)
    }
  }

  /**
   * Build API Gateway instance
   */
  async buildTheApi(user: User): Promise<any> {
    try {
      /* eslint @typescript-eslint/no-var-requires: "off" */
      const AvnApi = require('avn-api')
      const avnGatewayUrl = this.configService.get<string>('app.avn.gatewayUrl')
      const avnRelayer = this.configService.get<string>('app.avn.relayer')
      const options = {
        signer: {
          sign: async (encodedMessage: string) => {
            return await this.remoteSign(encodedMessage)
          },
          address: user.avnAddress
        },
        relayer: avnRelayer,
        hasPayer: true
      }
      return new AvnApi(avnGatewayUrl, options)
    } catch (error) {
      const message = `Failed to build avnApi. Error: ${error}`
      this.logger.debug(message)
      this.unlockAvnApiInstance()
      throw new InternalServerErrorException(message)
    }
  }

  /**
   * Acquire a lock on the avnApi instance
   * @param key key to factor
   * @param retryCount retry count
   */
  async lockAvnApiInstance(retryCount = 0): Promise<Lock> {
    const maxRetry = 12 // define max retry count
    const retryDelay = 5000 // 5 seconds delay before retrying
    const resource = 'avn-api-instance'
    try {
      return await this.redisService.acquireRedLock([resource], 120000) // 2 minutes
    } catch (error) {
      if (error instanceof ResourceLockedError) {
        if (retryCount < maxRetry) {
          this.logger.debug('avnApi instance already exists. Retrying...')
          await new Promise(resolve => setTimeout(resolve, retryDelay)) // wait before retrying
          return this.lockAvnApiInstance(retryCount + 1) // retry
        } else {
          this.logger.log('avnApi instance already exists. Max retry reached.')
          throw new ConflictException('avnApi instance already exists.')
        }
      }

      const message =
        'Unable to acquire Red Lock for avnApi instance. ' +
        `Resource ${resource}. Error: ${error.toString()}`
      this.logger.debug(message)
      throw new InternalServerErrorException(message)
    }
  }

  /**
   * Release the lock on the avnApi instance
   */
  async unlockAvnApiInstance(): Promise<void> {
    if (!this.currentRedLock) {
      return
    }

    try {
      await this.currentRedLock.release()
      this.logger.debug('avnApi lock released.')
    } catch (error) {
      this.logger.error(error)
      throw new InternalServerErrorException('Unable to release red lock.')
    }
  }

  /**
   * Convert public key to address using avnApi instance for a given user
   * @param publicKey
   * @param user
   * @returns address string
   */
  async convertPublicKeyToAddress(
    publicKey: string,
    user: User
  ): Promise<string> {
    if (!this._avnApi) {
      const avnApi = await this.initializeAvnApiInstance(user)
      const address = await avnApi.publicKeyToAddress(publicKey)
      this.unlockAvnApiInstance()
      return address
    }
    return await this._avnApi.publicKeyToAddress(publicKey)
  }
}
