import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionsFilter } from './filters/http-exceptions.filter'
import { LogService } from './log/log.service'
import { Transport } from '@nestjs/microservices'
import { throwError } from 'rxjs'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LogService().getLogger()
  })

  app.enableCors()
  app.useGlobalFilters(new HttpExceptionsFilter())

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const microservice = app.connectMicroservice(
    {
      transport: Transport.REDIS
    },
    { inheritAppConfig: true }
  )
  app.startAllMicroservices()
  // await app.startAllMicroservices().catch(err => {
  //   console.log(err)
  // }).then((val) => {
  //   console.log(val)
  // })

  await app.listen(process.env.PORT || 5002)
}

bootstrap()
