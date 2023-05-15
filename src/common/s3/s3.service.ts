import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name)
  assetsDistribution: string

  constructor(private readonly configService: ConfigService) {
    this.assetsDistribution = this.configService.get<string>(
      'app.aws.cfDistributionAssets'
    )
    if (process.env.NODE_ENV !== 'test.unit' && !this.assetsDistribution) {
      throw new Error('missing AWS_CF_DISTRIBUTION_ASSETS env var')
    }
  }

  mapDistributionUrl(key: string): string {
    return `https://${this.assetsDistribution}/${key}`
  }
}
