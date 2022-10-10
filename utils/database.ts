import { MongooseModuleOptions } from '@nestjs/mongoose'

export const getMongoUri = () => {
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in env')
  }

  if (mongoUri === 'mongodb://localhost:27017') {
    // May add: ?sslValidate=false&retryWrites=false&directConnection=true
    return mongoUri
  }

  const urlParts = mongoUri.split('?')
  let query = urlParts[1]

  query = query.replace('ssl_ca_certs', 'tlsCAFile')
  query = query.replace('tls=true', 'ssl=true')
  if (!query.includes('tlsCAFile')) {
    query = `${query}&tlsCAFile=rds-combined-ca-bundle.pem`
  }

  return `${urlParts[0]}?retryWrites=false&directConnection=true&${query}`
}

// TODO test mongo connection on app start
export const getMongoString = (): string => {
  const l = getMongoUri() + "/" + process.env.MONGODB_NAME
  return l
}
