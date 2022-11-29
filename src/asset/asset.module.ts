import { Module } from '@nestjs/common'
import { AssetService } from './services/asset.service'
import { AssetController } from './controllers/asset.controller'
import { LogModule } from '../log/log.module'

@Module({
  imports: [LogModule],
  providers: [AssetService],
  controllers: [AssetController]
})
export class AssetModule {}
