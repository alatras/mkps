import {
  Controller,
  Post,
  Body,
  UsePipes,
  Request,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ApiCreatedResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator'
import { LogService } from '../../log/log.service'
import { NftService } from '../services/nft.service'
import {
  CreateNftDto,
  CreateNftResponseDto,
  NftResponseDto
} from '../dto/nft.dto'
import { ErrorValidationPipe } from '../../pipes/error-validation.pipe'
import { User } from '../../user/schemas/user.schema'
import { from, MUUID } from 'uuid-mongodb'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'

@UsePipes(new ErrorValidationPipe())
@Controller('nft')
@ApiTags('nft')
export class NftHttpController {
  private log: LoggerService
  constructor(
    private readonly nftService: NftService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @ApiCreatedResponse({
    description:
      'Creates an NFT Draft, to be used to create an Avn Transaction',
    type: NftResponseDto
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(CreateNftResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post()
  async create(
    @Request() req: Express.Request,
    @Body() createNftDto: CreateNftDto
  ): Promise<CreateNftResponseDto> {
    try {
      return await this.nftService.create(
        from((req.user as User)._id as MUUID).toString(),
        createNftDto
      )
    } catch (err) {
      this.log.error('[NftHttpController] cannot create NFT:', err)
      errorResponseGenerator(err)
    }
  }
}
