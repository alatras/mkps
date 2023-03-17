import {
  Controller,
  Post,
  Body,
  UsePipes,
  Request,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ApiCreatedResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator'
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
import { ListNftDto, ListNftResponseDto } from '../dto/list-nft.dto'
import { DataWrapper } from '../../common/dataWrapper'

@UsePipes(new ErrorValidationPipe())
@Controller('nft')
@ApiTags('nft')
export class NftHttpController {
  private readonly logger: Logger = new Logger(NftHttpController.name)
  constructor(private readonly nftService: NftService) {}

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
  ): Promise<DataWrapper<NftResponseDto>> {
    const mintResult = await this.nftService.mint(
      req.user as User,
      createNftDto
    )
    this.logger.debug('mint NFT succeeded:', mintResult)
    return { data: mintResult }
  }

  /**
   * List an NFT
   * @param listNftDto Create NFT DTO (Auction)
   */
  @ApiCreatedResponse({
    description:
      'List an NFT. This creates an auction for the NFT, registers a listing in AvN Network, and returns Auction.',
    type: ListNftResponseDto
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post('list')
  async list(
    @Request() req: Express.Request,
    @Body() listNftDto: ListNftDto
  ): Promise<ListNftResponseDto> {
    try {
      const mintRes = await this.nftService.list(req.user as User, listNftDto)
      this.logger.debug('list NFT succeed:', mintRes)
      return mintRes
    } catch (err) {
      this.logger.error('cannot list NFT:', JSON.stringify(err))
      throw err
    }
  }
}
