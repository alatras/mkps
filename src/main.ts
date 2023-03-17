import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { GeneralExceptionsFilter } from './filters/http-exceptions.filter'
import { LogService } from './log/log.service'
import { Transport } from '@nestjs/microservices'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { getVersion } from 'jest'
import { getRedisOptions } from './utils/get-redis-options'

async function bootstrap() {
  const logger = new LogService().getLogger()
  const app = await NestFactory.create(AppModule, {
    logger
  })

  app.enableCors()
  app.useGlobalFilters(new GeneralExceptionsFilter())

  app.connectMicroservice(
    {
      transport: Transport.REDIS,
      options: getRedisOptions()
    },
    { inheritAppConfig: true }
  )

  await app.startAllMicroservices()

  const config = new DocumentBuilder()
    .setTitle('NFT Marketplace API')
    .setDescription(`Various APIs in the Marketplace ecosystem`)
    .setVersion(getVersion())
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  await app.listen(process.env.PORT || 5002)
}

bootstrap()
