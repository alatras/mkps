import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LogService } from '../../log/log.service'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { MintAvnTransactionDto } from '../dto/auth.dto'
import { AvnTransactionMintResponse } from '../response/anv-transaction-mint-response'

@Controller('avn-transaction')
export class AvnTransactionHttpController {
  private log: LoggerService

  constructor(
    private avnTransactionService: AvnTransactionService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mint')
  async createMintAvnTransaction(
    @Body() dto: MintAvnTransactionDto
  ): Promise<AvnTransactionMintResponse | Error> {
    try {
      const create = await this.avnTransactionService.createMintAvnTransaction(
        dto.nftId
      )
      this.log.log(
        'AvnTransactionHttpController - ANV transaction created successfully:',
        dto
      )
      return create
    } catch (err) {
      this.log.error(
        'AvnTransactionHttpController - cannot create AVN transaction:',
        dto,
        err
      )
      throw err
    }
  }
}
