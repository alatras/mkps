export const getMongoUri = () => {
  let mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in env')
  }

  const urlParts = mongoUri.split('?')
  let query = urlParts[1]

  query = query.replace('ssl_ca_certs', 'tlsCAFile')
  query = query.replace('tls=true', 'ssl=true')
  if (!query.includes('tlsCAFile')) {
    query = `${query}&tlsCAFile=rds-combined-ca-bundle.pem`
  }

  mongoUri = `${urlParts[0]}?retryWrites=false&directConnection=true&${query}`

  return mongoUri
}
