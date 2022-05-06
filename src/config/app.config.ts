import { registerAs } from '@nestjs/config'
import { getMongoUri } from '../../utils/database'

export default registerAs('app', () => ({
  port: process.env.PORT ?? 3000,
  webAppUrl: process.env.WEB_APP_URL ?? 'localhost',
  royalties: process.env.ROYALTIES,
  originalContentPublic: process.env.ORIGINAL_CONTENT_PUBLIC,
  environment: process.env.ENVIRONMENT,
  isSqsDisabled: process.env.IS_SQS_DISABLED,
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
    s3BucketNameNftOrig: process.env.AWS_S3_BUCKET_NAME_NFT_ORIG,
    s3BucketRegion: process.env.AWS_S3_BUCKET_REGION
  }
}))
