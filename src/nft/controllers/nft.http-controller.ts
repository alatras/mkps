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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import MongooseClassSerializerInterceptor from '../../interceptors/mongoose-class-serializer.interceptor'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'
import { ListNftDto, ListNftResponseDto } from '../dto/list-nft.dto'

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

  /**
   * Mint an NFT
   * @param createNftDto Create NFT DTO
   */
  @ApiCreatedResponse({
    description:
      'Mint an NFT. This creates an NFT Draft, uses it to create an Avn Transaction, and returns request ID.',
    type: NftResponseDto
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(CreateNftResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post('mint')
  async mint(
    @Request() req: Express.Request,
    @Body() createNftDto: CreateNftDto
  ): Promise<CreateNftResponseDto> {
    try {
      return await this.nftService.mint(req.user as User, createNftDto)
    } catch (err) {
      this.log.error('[NftHttpController] cannot create NFT:', err)
      errorResponseGenerator(err)
    }
  }

  /**
   * List an NFT
   * @param listNftDto Create NFT DTO
   */
  @ApiCreatedResponse({
    description:
      'List an NFT. This creates an auction for the NFT, registers a listing in AvN Network, and returns Auction.',
    type: ListNftResponseDto
  })
  @UseInterceptors(MongooseClassSerializerInterceptor(CreateNftResponseDto))
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post('list')
  async list(
    @Request() req: Express.Request,
    @Body() listNftDto: ListNftDto
  ): Promise<ListNftResponseDto> {
    try {
      return await this.nftService.list(req.user as User, listNftDto)
    } catch (err) {
      this.log.error('[NftHttpController] cannot list NFT:', err)
      errorResponseGenerator(err)
    }
  }
}
