import { Module } from '@nestjs/common'
import { VaultService } from './services/vault.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import config from '../config/app.config'
import { LogModule } from '../log/log.module'

@Module({
  imports: [LogModule, HttpModule, ConfigModule.forRoot({ load: [config] })],
  providers: [VaultService]
})
export class VaultModule {}
