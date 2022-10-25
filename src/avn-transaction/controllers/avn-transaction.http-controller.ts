import { Body, Controller, Param, Get, Post, UseGuards, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LogService } from '../../log/log.service'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { MintAvnTransactionDto } from '../dto/mint-avn-transaction.dto'
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

  @UseGuards(AuthGuard('jwt'))
  @Get('mint/request/:requestId')
  async getAvnTransaction(
    @Param('requestId') requestId: string
  ) {
    try {
      const transaction = await this.avnTransactionService.getAvnTransactionByRequestId(requestId)
      if (transaction) {
        return transaction
      }
      throw new NotFoundException('AVN transaction not found')
    } catch (err) {
      this.log.error(`[getAvnTransaction] error: `, err)
      switch (err.status) {
        case 404:
          throw new NotFoundException(err.message)
        case 400:
          throw new BadRequestException(err.message)
        default:
          throw new InternalServerErrorException(err.message)
      }
    }
  }
}
