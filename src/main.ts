import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionsFilter } from './filters/http-exceptions.filter'
import { LogService } from './log/log.service'
import { Transport } from '@nestjs/microservices'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Microservices } from '../utils/microservices'
import { getVersion } from 'jest'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LogService().getLogger()
  })

  app.enableCors()
  app.useGlobalFilters(new HttpExceptionsFilter())

  app.connectMicroservice(
    { transport: Transport.REDIS },
    { inheritAppConfig: true }
  )

  await app.startAllMicroservices()

  const config = new DocumentBuilder()
    .setTitle('VereNFT')
    .setDescription(`Various APIs in the VereNFT ecosystem`)
    .setVersion(getVersion())
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  await app.listen(process.env.PORT || 5002)
}

bootstrap()
