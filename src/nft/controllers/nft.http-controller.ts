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
      const mintRes = await this.nftService.mint(req.user as User, createNftDto)
      this.log.debug('[NftHttpController.mint] mint NFT succeed:', mintRes)
    } catch (err) {
      this.log.error('[NftHttpController.mint] cannot mint NFT:', JSON.stringify(err))
      return err
    }
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
      this.log.debug('[NftHttpController.list] list NFT succeed:', mintRes)
      return mintRes
    } catch (err) {
      this.log.error('[NftHttpController.list] cannot list NFT:', JSON.stringify(err))
      throw err
    }
  }
}
