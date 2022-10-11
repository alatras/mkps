import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AvnTransactionService } from './avn-transaction.service'
import { MintAvnTransactionDto } from './dto/auth.dto'
import { AvnTransactionMintResponse } from './response/anv-transaction-mint-response'

@Controller('avn-transaction')
export class AvnTransactionController {
  constructor(
    private avnTransactionService: AvnTransactionService,
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createMintAvnTransaction(@Body() dto: MintAvnTransactionDto)
    : Promise<AvnTransactionMintResponse | Error> {
    try {
      return await this.avnTransactionService.createMintAvnTransaction(dto.nftId, dto.requestId)
    } catch (err) {
      return err
    }
  }
}
