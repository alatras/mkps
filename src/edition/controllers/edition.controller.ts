import {
  Controller,
  Post,
  Body,
  Request,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  UseInterceptors,
  UseGuards,
  UsePipes
} from '@nestjs/common'
import { CreateEditionDto, EditionResponseDto } from '../dto/edition.dto'
import { EditionService } from '../edition.service'
import { DataWrapper } from '../../common/dataWrapper'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { ErrorValidationPipe } from '../../pipes/error-validation.pipe'

@Controller('edition')
export class EditionController {
  constructor(private editionService: EditionService) {}

  @UseInterceptors(MongooseClassSerializerInterceptor(DataWrapper))
  @UsePipes(new ErrorValidationPipe())
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:editions')
  @Post('mint')
  async create(
    @Request() req: Express.Request,
    @Body() createEditionDto: CreateEditionDto
  ): Promise<DataWrapper<EditionResponseDto>> {
    try {
      return await this.editionService.createEdition(
        createEditionDto,
        (req as any).user
      )
    } catch (err) {
      switch (err.status) {
        case 404:
          throw new NotFoundException(err.message)
        case 400:
          throw new BadRequestException(err.message)
        case 409:
          throw new ConflictException(err.message)
        case 500:
          throw new InternalServerErrorException(err.message)
        default:
          throw new InternalServerErrorException(err.message)
      }
    }
  }
}
