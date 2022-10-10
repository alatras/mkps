import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { logger } from '../main'
import { AvnTransactionService } from './avn-transaction.service'
import { MintAvnTransactionDto } from './dto/auth.dto'

@Controller('avn-transaction')
export class AvnTransactionController {
  constructor(private avnTransactionService: AvnTransactionService) { }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createMintAvnTransaction(@Body() dto: MintAvnTransactionDto) {
    try {
      return await this.avnTransactionService.createMintAvnTransaction(dto.nftId, dto.requestId)
    } catch (err) {
      logger.error('AvnTransactionController - error:', err)
      return err
    }
  }
}
