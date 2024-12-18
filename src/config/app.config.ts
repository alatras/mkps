import { registerAs } from '@nestjs/config'
import { getMongoUri } from '../../utils/database'

export default registerAs('app', () => ({
  port: process.env.PORT ?? 3000,
  webAppUrl: process.env.WEB_APP_URL ?? 'localhost',
  royalties: process.env.ROYALTIES,
  originalContentPublic: process.env.ORIGINAL_CONTENT_PUBLIC,
  environment: process.env.ENVIRONMENT,
  isSqsDisabled: process.env.IS_SQS_DISABLED,
  tenantName: process.env.TENANT_NAME,
  secondarySaleMode: process.env.SECONDARY_SALE_MODE,
  auth0: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE
  },
  database: {
    mongoDbName: process.env.MONGODB_NAME,
    mongoDbUri: getMongoUri()
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecretKey: process.env.STRIPE_WEBHOOK_SECRET_KEY
  },
  aws: {
    cfDistributionAssets: process.env.AWS_CF_DISTRIBUTION_ASSETS,
    sqsAvnTransactionsUrl: process.env.AWS_SQS_AVN_TRANSACTIONS_URL,
    sqsEthEventsUrl: process.env.AWS_SQS_ETH_EVENTS_URL,
    s3BucketNameAssets: process.env.AWS_S3_BUCKET_NAME_ASSETS,
    s3BucketNameUserOrig: process.env.AWS_S3_BUCKET_NAME_NFT_ORIG,
    s3BucketRegion: process.env.AWS_S3_BUCKET_REGION
  },
  redis: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_URL
  },
  vault: {
    baseUrl: process.env.VAULT_URL,
    roleId: process.env.VAULT_APP_ROLE_ID,
    secretId: process.env.VAULT_APP_SECRET_ID,
    authority: {
      username: process.env.VAULT_AUTHORITY_USERNAME,
      password: process.env.VAULT_AUTHORITY_PASSWORD
    },
    relayer: {
      username: process.env.VAULT_RELAYER_USERNAME,
      password: process.env.VAULT_RELAYER_PASSWORD
    }
  },
  avn: {
    gatewayUrl: process.env.AVN_GATEWAY_URL,
    relayer: process.env.AVN_RELAYER,
    externalRefVersion: process.env.EXTERNAL_REF_VERSION,
    avnAuthority: process.env.AVN_AUTHORITY,
    suri: process.env.SUBSTRATE_ACCOUNT_PRIVATE_KEY,
    anvPollingInterval: process.env.AVN_POLLING_INTERVAL,
    avnPollingTimeout: process.env.AVN_POLLING_TIMEOUT
  },
  splitFee: {
    baseUrl: process.env.SPLIT_FEE_BASE_URL,
    username: process.env.SPLIT_FEE_USERNAME,
    password: process.env.SPLIT_FEE_PASSWORD,
    payerId: process.env.PAYER_ID
  }
}))
