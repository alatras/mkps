import { Controller, Get, Param, Query, Request, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common'
import { ApiCreatedResponse } from '@nestjs/swagger'
import { Permissions } from 'src/auth/decorators/permissions.decorator'
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'
import { PermissionsGuard } from 'src/auth/permissions.guard'
import { DataWrapper } from 'src/common/dataWrapper'
import MongooseClassSerializerInterceptor from 'src/interceptors/mongoose-class-serializer.interceptor'
import { ErrorValidationPipe } from 'src/pipes/error-validation.pipe'
import { PresignedUrlQueryDto } from '../dto/presigned-url-request.dto'
import { PresignedUrlResponse } from '../dto/presigned-url-response.dto'
import { AssetService } from '../services/asset.service'

@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) { }

  @ApiCreatedResponse({
    description:
      'Get a presigned URL for uploading a thumbnail on S3 bucket.',
    type: PresignedUrlResponse
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(PresignedUrlResponse))
  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions('write:nfts', 'read:nfts')
  @Get('s3-url-for-small-preview')
  @UsePipes(new ErrorValidationPipe())
  async getPresignedUrlForSmallPreview(
    @Request() req: Express.Request,
    @Query() query: PresignedUrlQueryDto
  ): Promise<DataWrapper<PresignedUrlResponse>> {

    // TODO: user check and pass if needed

    return await this.assetService.getPresignedUrlForSmallImage(
      query.fileName,
      query.contentType,
    )
  }

  // @UsePipes(new ErrorValidationPipe())
  // @Get('he')
  // getHello(@Query() query: PresignedUrlQueryDto): PresignedUrlQueryDto {
  //   console.log({ query });

  //   return query;
  // }
}
