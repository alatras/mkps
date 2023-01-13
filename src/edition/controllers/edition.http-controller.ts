import {
  Controller,
  Post,
  Body,
  Request,
  UseInterceptors,
  UseGuards,
  UsePipes
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { CreateEditionDto, EditionResponseDto } from '../dto/edition.dto'
import { EditionService } from '../edition.service'
import { LogService } from '../../log/log.service'
import { DataWrapper } from '../../common/dataWrapper'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { ErrorValidationPipe } from '../../pipes/error-validation.pipe'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'

@Controller('edition')
export class EditionController {
  private log: LoggerService
  constructor(
    private editionService: EditionService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @UseInterceptors(MongooseClassSerializerInterceptor(EditionResponseDto))
  @Permissions('write:nfts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @UsePipes(new ErrorValidationPipe())
  @Post('mint')
  async create(
    @Body() createEditionDto: CreateEditionDto,
    @Request() req: Express.Request
  ): Promise<DataWrapper<EditionResponseDto>> {
    try {
      return await this.editionService.mintEdition(
        createEditionDto,
        (req as any).user
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
