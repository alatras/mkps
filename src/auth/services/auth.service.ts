import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { MUUID } from 'uuid-mongodb'
import { uuidFrom } from '../../utils'
import { JwtPayload } from '../jwt.strategy'
import {
  NotificationPreferences,
  Provider,
  User
} from '../../user/schemas/user.schema'
import { VaultService } from '../../vault/services/vault.service'
import { SplitFeeService } from '../../user/split.fee.service'
import { AvnTransactionApiSetupService } from '../../avn-transaction/services/avn-transaction-api-setup.service'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { CreateUserDto } from '../../user/dto/user.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private vaultService: VaultService,
    private splitFeeService: SplitFeeService,
    private avnTransactionApiSetupService: AvnTransactionApiSetupService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {}

  async validateUser(payload: JwtPayload): Promise<User> {
    const [provider, id] = payload.sub.split('|')

    let user = await this.getUserByProvider(id, provider as Provider)

    if (user) {
      // Update the user with notification preferences if they don't exist
      if (!user.notificationPreferences) {
        user = await this.updateUserNotificationPreferences(user._id)
      }
    }

    if (!user) {
      // Create user in DB
      user = await this.createUser({
        provider: {
          name: provider as Provider,
          id
        }
      })

      // Create user on network via Vault
      const userAvnPubKey = await this.vaultService.getUserKeyOrCreateNewUser(
        id
      )
      if (!userAvnPubKey) {
        await this.rollbackUserCreation(user)
      }

      // Update user in DB with AVN public key
      let avnAddress: string
      try {
        //
        avnAddress =
          this.avnTransactionApiSetupService.convertPublicKeyToAddress(
            userAvnPubKey
          )
        user = await this.updateUserById(user._id, {
          avnPubKey: userAvnPubKey,
          avnAddress
        })
        // Register as a split fee user
        await this.splitFeeService.registerAsSplitFeeUser(
          userAvnPubKey,
          `Marketplace user id: ${uuidFrom(
            user._id
          ).toString()}, providerId: ${id}`
        )
      } catch (err) {
        this.logger.error(
          `[validateUser] Error converting public key to address: ${err}`
        )
        await this.rollbackUserCreation(user)
      }
    }

    return user
  }

  /**
   * Rollback the user creation process
   * @param user The user to delete
   * @throws InternalServerErrorException
   */
  async rollbackUserCreation(user: User) {
    await this.deleteUserById(user._id)
    const message = 'Could not create Vault user'
    this.logger.error(`[validateUser] ${message}`)
    throw new InternalServerErrorException(message)
  }

  /**
   * Update the user's notification preferences
   * @param userId The user's ID
   * @returns The updated user
   */
  async updateUserNotificationPreferences(userId: MUUID): Promise<User> {
    try {
      return await this.updateUserById(userId, {
        notificationPreferences: new NotificationPreferences()
      })
    } catch (err) {
      const message = `Error updating user notification preferences: ${JSON.stringify(
        err
      )}`
      this.logger.error(`[updateUserNotificationPreferences] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }

  private async getUserByProvider(
    providerId: string,
    providerName: Provider
  ): Promise<User> {
    try {
      return await firstValueFrom(
        this.clientProxy.send<User>(
          MessagePatternGenerator('user', 'getUserByProvider'),
          { providerId, providerName }
        )
      )
    } catch (err) {
      const message = `Error finding user by provider: ${JSON.stringify(err)}`
      this.logger.error(`[findUserByProvider] ${message}`)
      throw new NotFoundException(message)
    }
  }

  // write a function just like getUserByProvider but for createUser
  private async createUser(data: CreateUserDto): Promise<User> {
    try {
      return await firstValueFrom(
        this.clientProxy.send<User>(
          MessagePatternGenerator('user', 'createUser'),
          { data }
        )
      )
    } catch (err) {
      const message = `Error creating user: ${JSON.stringify(err)}`
      this.logger.error(`[createUser] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }

  private async updateUserById(userId: MUUID, data: any): Promise<User> {
    try {
      return await firstValueFrom(
        this.clientProxy.send<User>(
          MessagePatternGenerator('user', 'updateUserById'),
          { userId: uuidFrom(userId).toString(), data }
        )
      )
    } catch (err) {
      const message = `Error updating user: ${JSON.stringify(err)}`
      this.logger.error(`[updateUserById] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }

  private async deleteUserById(userId: MUUID): Promise<User> {
    try {
      return await firstValueFrom(
        this.clientProxy.send<User>(
          MessagePatternGenerator('user', 'deleteUserById'),
          { userId: uuidFrom(userId).toString() }
        )
      )
    } catch (err) {
      const message = `Error deleting user: ${JSON.stringify(err)}`
      this.logger.error(`[deleteUserById] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }
}
