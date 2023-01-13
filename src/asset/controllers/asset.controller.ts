import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { ApiCreatedResponse } from '@nestjs/swagger'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { DataWrapper } from '../../common/dataWrapper'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { LogService } from '../../log/log.service'
import { ErrorValidationPipe } from '../../pipes/error-validation.pipe'
import { PresignedUrlQueryDto } from '../dto/presigned-url-request.dto'
import { PresignedUrlResponse } from '../dto/presigned-url-response.dto'
import { AssetService } from '../services/asset.service'

@Controller('asset')
export class AssetController {
  private log: LoggerService

  constructor(
    private readonly assetService: AssetService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @ApiCreatedResponse({
    description:
      'Get a presigned URL for uploading a small/large review on S3 bucket.',
    type: PresignedUrlResponse
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(PresignedUrlResponse))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts', 'read:nfts')
  @Get('s3-url-for-preview')
  @UsePipes(new ErrorValidationPipe())
  async getPresignedUrlForSmallPreview(
    @Query() query: PresignedUrlQueryDto
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    try {
      return await this.assetService.getPresignedUrlForSmallImage(
        query.contentType,
        query.nftId
      )
    } catch (err) {
      this.log.error(
        '[getPresignedUrlForSmallPreview] cannot create presigned URL for small image:',
        err
      )
      return new InternalServerErrorException(err.message)
    }
  }

  @ApiCreatedResponse({
    description:
      'Get a presigned URL for uploading an original image on S3 bucket.',
    type: PresignedUrlResponse
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(PresignedUrlResponse))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts', 'read:nfts')
  @Get('s3-url-for-original')
  @UsePipes(new ErrorValidationPipe())
  async getPresignedUrlForOriginalAsset(
    @Query() query: PresignedUrlQueryDto
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    try {
      return await this.assetService.getPresignedUrlForOriginal(
        query.contentType,
        query.nftId
      )
    } catch (err) {
      this.log.error(
        '[getPresignedUrlForOriginalAsset] cannot create presigned URL for original image:',
        err
      )
      errorResponseGenerator(err)
    }
  }
}
