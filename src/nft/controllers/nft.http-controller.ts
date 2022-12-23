import {
  Controller,
  Post,
  Body,
  UsePipes,
  Request,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { NftService } from '../services/nft.service'
import {
  CreateNftDto,
  CreateNftResponseDto,
  NftResponseDto
} from '../dto/nft.dto'
import { ErrorValidationPipe } from '../../pipes/error-validation.pipe'
import { User } from '../../user/schemas/user.schema'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { ApiTags } from '@nestjs/swagger'
import { ApiCreatedResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator'

@UsePipes(new ErrorValidationPipe())
@Controller('nft')
@ApiTags('nft')
export class NftHttpController {
  constructor(private readonly nftService: NftService) {}

  @ApiCreatedResponse({
    description:
      'Creates an NFT Draft, to be used to create an Avn Transaction',
    type: NftResponseDto
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(CreateNftResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post('mint')
  async create(
    @Request() req: Express.Request,
    @Body() createNftDto: CreateNftDto
  ): Promise<CreateNftResponseDto> {
    return await this.nftService.create((req.user as User)._id, createNftDto)
  }
}
