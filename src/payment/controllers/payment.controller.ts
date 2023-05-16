import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe
} from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger'
import { PlaceBidResponseDto } from '../dto/placeBidResponse.dto'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { Permissions } from '../../auth/decorators/permissions.decorator'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { DataWrapper } from '../../common/dataWrapper'
import { PaymentService } from '../services/payment.service'
import { User } from '../../user/schemas/user.schema'
import { PlaceBidDto } from '../dto/placeBid.dto'

@Controller('payment')
@ApiTags('payment')
export class PaymentController {
  private readonly logger: Logger = new Logger(PaymentController.name)

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Place a bid for the given auction.
   * This places the bid locally and on the blockchain with
   * using the Stripe API for payment.
   * @param placeBidDto Place bid DTO
   * @param req Express request
   */
  @ApiCreatedResponse({
    description: 'Bid on an auction.',
    type: PlaceBidResponseDto
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('read:nfts')
  @Post('bid')
  @UsePipes(new ValidationPipe())
  async bid(
    @Request() req: Express.Request,
    @Body() placeBidDto: PlaceBidDto
  ): Promise<DataWrapper<PlaceBidResponseDto>> {
    this.logger.debug('place Bid DTO:' + JSON.stringify(placeBidDto))
    try {
      const placeBidResponse = await this.paymentService.bid(
        req.user as User,
        placeBidDto
      )
      this.logger.debug('bid place succeed:', placeBidResponse)
      return { data: placeBidResponse }
    } catch (err) {
      this.logger.error('cannot place bid:', JSON.stringify(err))
      throw err
    }
  }
}
