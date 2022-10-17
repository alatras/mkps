import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LogService } from '../log/log.service'
import { AvnTransactionService } from './avn-transaction.service'
import { MintAvnTransactionDto } from './dto/auth.dto'
import { AvnTransactionMintResponse } from './response/anv-transaction-mint-response'

@Controller('avn-transaction')
export class AvnTransactionController {
  private log: LoggerService
  constructor(
    private avnTransactionService: AvnTransactionService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createMintAvnTransaction(
    @Body() dto: MintAvnTransactionDto
  ): Promise<AvnTransactionMintResponse | Error> {
    try {
      const create = await this.avnTransactionService.createMintAvnTransaction(
        dto.nftId,
        dto.requestId
      )
      this.log.log(
        'AvnTransactionController - ANV transaction created successfully:',
        dto
      )
      return create
    } catch (err) {
      this.log.error(
        `AvnTransactionController - cannot create AVN transaction for NFT `
        + dto.nftId + dto.requestId,
        err
      )
      switch (err.status) {
        case 404:
          throw new NotFoundException(err.message)
        case 400:
          throw new BadRequestException(err.message)
        case 500:
          throw new InternalServerErrorException(err.message)
        default:
          throw new InternalServerErrorException(err.message)
      }
    }
  }
}
