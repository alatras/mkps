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
import { ApiSigner } from '../schemas/avn-api'

@Injectable()
export class AvnTransactionApiSetupService {
  private _avnApi: AvnApi
  private readonly logger = new Logger(AvnTransactionApiSetupService.name)
  private currentAvnUser: User
  private currentRedLock: Lock

  constructor(
    private configService: ConfigService,
    private vaultService: VaultService,
    private redisService: RedisService
  ) {
    this.configService = configService

    /* eslint @typescript-eslint/no-var-requires: "off" */
    const AvnApi = require('avn-api')
    const avnGatewayUrl = this.configService.get<string>('app.avn.gatewayUrl')
    const avnRelayer = this.configService.get<string>('app.avn.relayer')
    const options = {
      relayer: avnRelayer,
      hasPayer: true
    }

    try {
      const api = new AvnApi(avnGatewayUrl, options)
      this._avnApi = api
      this._avnApi.isInitialised = false
    } catch (error) {
      const message = `Failed to build avnApi. Error: ${error}`
      this.logger.debug(message)
      throw new InternalServerErrorException(message)
    }
  }

  /**
   * Get the avnApi instance
   * @param user
   */
  async getAndLockAvnApiInstance(user: User): Promise<AvnApi> {
    // Lock the avnApi instance for this user
    this.currentRedLock = await this.lockAvnApiInstance()

    this.currentAvnUser = user

    try {
      if (this._avnApi.isInitialised === false) {
        ;(this._avnApi as any).options['signer'] = this.getSigner(user)
        await this._avnApi.init()
        this._avnApi.isInitialised = true
      } else {
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
      throw new InternalServerErrorException(message)
    }

    const signerVaultUserName = this.currentAvnUser.provider.id

    return await this.vaultService.userSign(message, signerVaultUserName)
  }

  /**
   * Set a new signer in Avn Api. This will modify the avnApi instance
   */
  private async setAvnApiSigner(user: User) {
    try {
      await this._avnApi.setSigner(this.getSigner(user))
    } catch (error) {
      const message = `Failed to set avnApi signer. Error: ${error}`
      this.logger.debug(message)
      throw new InternalServerErrorException(message)
    }
  }

  /**
   * Get an api signer object based on a user
   * @param user current user
   */
  private getSigner(user: User): ApiSigner {
    return {
      sign: async (encodedMessage: string) => {
        return await this.remoteSign(encodedMessage)
      },
      address: user.avnAddress
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
   * Convert public key to address using avnApi instance
   * @param publicKey
   * @returns address string
   */
  convertPublicKeyToAddress(publicKey: string): string {
    return this._avnApi.utils.publicKeyToAddress(publicKey)
  }
}
