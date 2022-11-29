import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UsePipes
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { ApiCreatedResponse } from '@nestjs/swagger'
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
    description: 'Get a presigned URL for uploading a thumbnail on S3 bucket.',
    type: PresignedUrlResponse
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(PresignedUrlResponse))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts', 'read:nfts')
  @Get('s3-url-for-preview')
  @UsePipes(new ErrorValidationPipe())
  async getPresignedUrlForSmallPreview(
    @Request() req: Express.Request,
    @Query() query: PresignedUrlQueryDto
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    try {
      return await this.assetService.getPresignedUrlForSmallImage(
        query.fileName,
        query.contentType
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
    @Request() req: Express.Request,
    @Query() query: PresignedUrlQueryDto
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    try {
      return await this.assetService.getPresignedUrlForOriginal(
        query.fileName,
        query.contentType
      )
    } catch (err) {
      this.log.error(
        '[getPresignedUrlForOriginalAsset] cannot create presigned URL for original image:',
        err
      )
      return new InternalServerErrorException(err.message)
    }
  }
}
