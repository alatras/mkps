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
import { CancelListingDto } from '../dto/cancel-listing-of-nft.dto'
import { BuyNftDto, BuyNftResponseDto } from '../dto/buy-nft.dto'

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
    try {
      const mintResult = await this.nftService.mint(
        req.user as User,
        createNftDto
      )
      this.logger.debug('1st phase of mint NFT succeed:', mintResult)
      return { data: mintResult }
    } catch (err) {
      this.logger.error('cannot mint NFT:', JSON.stringify(err))
      throw err
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
      this.logger.debug('list NFT succeed:', mintRes)
      return mintRes
    } catch (err) {
      this.logger.error('cannot list NFT:', JSON.stringify(err))
      throw err
    }
  }

  /**
   * Cancel an NFT listing
   * @param listNftDto cancel listing DTO: { auctionId }
   */
  @ApiCreatedResponse({
    description:
      'Cancel an NFT listing. This withdraws the auction, ' +
      'cancels the listing in AvN Network, and returns cancelled Auction.',
    type: ListNftResponseDto
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post('cancel-listing')
  async cancelListing(
    @Request() req: Express.Request,
    @Body() cancelListingDto: CancelListingDto
  ): Promise<ListNftResponseDto> {
    try {
      const mintRes = await this.nftService.cancelListing(
        req.user as User,
        cancelListingDto
      )
      this.logger.log('cancel NFT succeed:', mintRes)
      return mintRes
    } catch (err) {
      this.logger.error('cannot cancel NFT:', JSON.stringify(err))
      throw err
    }
  }

  /**
   * Buy an NFT
   * @param buyNftDto Buy NFT DTO
   * @returns Buy NFT Response DTO
   */
  @ApiCreatedResponse({
    description: 'Buy an NFT. This buys an NFT and returns the transaction.',
    type: NftResponseDto
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('write:nfts')
  @Post('buy')
  async buy(
    @Request() req: Express.Request,
    @Body() buyNftDto: BuyNftDto
  ): Promise<BuyNftResponseDto> {
    try {
      const buyRes = await this.nftService.buyNft(req.user as User, buyNftDto)
      this.logger.debug('buy NFT succeed:' + buyRes)
      return buyRes
    } catch (err) {
      this.logger.error('cannot buy NFT:' + JSON.stringify(err))
      throw err
    }
  }
}
