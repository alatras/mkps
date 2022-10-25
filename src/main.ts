import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionsFilter } from './filters/http-exceptions.filter'
import { LogService } from './log/log.service'
import { Transport } from '@nestjs/microservices'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LogService().getLogger()
  })

  app.enableCors()
  app.useGlobalFilters(new HttpExceptionsFilter())

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.connectMicroservice(
    { transport: Transport.REDIS },
    { inheritAppConfig: true }
  )
  app.startAllMicroservices()

  await app.listen(process.env.PORT || 5002)
}

bootstrap()
