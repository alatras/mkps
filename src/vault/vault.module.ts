import { Module } from '@nestjs/common'
import { VaultService } from './services/vault.service'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import config from '../config/app.config'
@Module({
  imports: [HttpModule, ConfigModule.forRoot({ load: [config] })],
  providers: [VaultService]
})
export class VaultModule {}
