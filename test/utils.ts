import { AuthenticationClient } from 'auth0'

export async function getToken() {
  const authClient = new AuthenticationClient({
    domain: process.env.TEST_AUTH0_DOMAIN as string,
    clientId: process.env.TEST_AUTH0_CLIENT_ID as string,
    clientSecret: process.env.TEST_AUTH0_CLIENT_SECRET as string
  })

  const tokenResponse = await authClient.passwordGrant({
    username: process.env.TEST_AUTH0_USERNAME as string,
    password: process.env.TEST_AUTH0_PASSWORD as string,
    realm: process.env.TEST_AUTH0_REALM as string,
    audience: process.env.AUTH0_AUDIENCE as string
  })

  return tokenResponse.access_token
}
