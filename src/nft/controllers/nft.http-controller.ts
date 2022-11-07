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
import { CreateNftDto, NftResponseDto } from '../dto/nft.dto'
import { ErrorValidationPipe } from '../../pipes/error-validation.pipe'
import { User } from '../../user/schemas/user.schema'
import { from, MUUID } from 'uuid-mongodb'
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
  @UseInterceptors(MongooseClassSerializerInterceptor(NftResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post()
  async create(
    @Request() req: Express.Request,
    @Body() createNftDto: CreateNftDto
  ): Promise<NftResponseDto> {
    const nft = await this.nftService.create(
      from((req.user as User)._id as MUUID).toString(),
      createNftDto
    )

    return new NftResponseDto(nft)
  }
}
