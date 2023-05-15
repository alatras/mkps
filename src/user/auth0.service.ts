import { Injectable } from '@nestjs/common'
import { ManagementClient, User as Auth0User } from 'auth0'
import { Provider, User } from './schemas/user.schema'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class Auth0Service {
  private managementClient: ManagementClient
  private configService: ConfigService

  constructor(configService: ConfigService) {
    this.configService = configService
  }

  /**
   * Auth0 user metadata for the given user ID.
   * @param userId The user's Auth0 user ID
   * @returns The user's Auth0 user metadata
   */
  getAuth0User = async (userId: string): Promise<Auth0User> => {
    const managementClient = this.getManagementClient()
    if (!managementClient) {
      return null
    }
    return await managementClient.getUser({ id: userId })
  }

  /**
   * Get Auth0 user ID for the given user.
   * Concatenates the Auth0 provider name and user ID
   * @param user The user to get the Auth0 ID for
   * @returns The user's Auth0 ID
   */
  getAuth0UserId = (user: User): string => {
    const { name } = user.provider
    let { id } = user.provider

    if (name === ('oauth2|siwe' as Provider)) {
      // Highlander doesn't support generating pubKeys for user IDs with some special characters
      id = encodeURIComponent(id.replace(/-/g, ':'))
    }

    return `${name}|${id}`
  }

  getAuth0Client(): ManagementClient {
    const domain = this.configService.get<string>('AUTH0_CANONICAL_DOMAIN')
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID')
    const clientSecret = this.configService.get<string>('AUTH0_CLIENT_SECRET')
    if (!domain || !clientId || !clientSecret) {
      return null
    }

    if (!this.managementClient) {
      this.managementClient = new ManagementClient({
        domain,
        clientId,
        clientSecret
      })
    }

    return this.managementClient
  }

  /**
   * Returns a new instance of ManagementClient with the provided credentials if it doesn't exist.
   * If the instance already exists, return that instance.
   * @returns {ManagementClient|null} Returns the instance of ManagementClient if the credentials exist in environment variables, otherwise returns null.
   */
  private getManagementClient = (): ManagementClient | null => {
    if (!process.env.AUTH0_CANONICAL_DOMAIN) {
      return null
    }
    if (!this.managementClient) {
      this.managementClient = new ManagementClient({
        domain: process.env.AUTH0_CANONICAL_DOMAIN as string,
        clientId: process.env.AUTH0_CLIENT_ID as string,
        clientSecret: process.env.AUTH0_CLIENT_SECRET as string
      })
    }

    return this.managementClient
  }
}
