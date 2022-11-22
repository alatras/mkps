import { Module } from '@nestjs/common';
import { AssetService } from './services/asset.service';
import { AssetController } from './controllers/asset.controller';

@Module({
  providers: [AssetService],
  controllers: [AssetController]
})
export class AssetModule {}
