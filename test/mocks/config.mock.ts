import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  auth0: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    testClientId: process.env.TEST_AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    testClientSecret: process.env.TEST_AUTH0_CLIENT_SECRET,
    testAuth0Username: process.env.TEST_AUTH0_USERNAME,
    testAuth0Password: process.env.TEST_AUTH0_PASSWORD,
    testAuth0Realm: process.env.TEST_AUTH0_REALM,
    audience: process.env.AUTH0_AUDIENCE
  }
}))
