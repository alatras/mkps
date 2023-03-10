import {
  Body,
  Controller,
  Param,
  Get,
  Post,
  UseGuards,
  NotFoundException
} from '@nestjs/common'
import { Request, LoggerService } from '@nestjs/common'
import { Request as ExpressRequest } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ApiCreatedResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator'
import { LogService } from '../../log/log.service'
import { User } from '../../user/schemas/user.schema'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { MintAvnTransactionDto } from '../dto/mint-avn-transaction.dto'
import { AvnTransactionMintResponse } from '../response/anv-transaction-mint-response'
import { AvnNftTransaction } from '../schemas/avn-transaction.schema'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'

@ApiTags('AvnTransaction')
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
  @ApiCreatedResponse({
    description:
      'Mints an NFT on the blockchain. Pass in an NftId from a previously created draft.',
    type: AvnTransactionMintResponse
  })
  @Post('mint')
  async createMintAvnTransaction(
    @Request() req: ExpressRequest,
    @Body() dto: MintAvnTransactionDto
  ): Promise<AvnTransactionMintResponse | Error> {
    try {
      const user: User = (req as any).user
      const create = await this.avnTransactionService.mintNft(dto.nftId, user)

      this.log.log(
        '[AvnTransactionHttpController] ANV transaction created successfully:',
        dto
      )

      return create
    } catch (err) {
      this.log.error(
        '[AvnTransactionHttpController] cannot create AVN transaction:',
        dto,
        err
      )
      errorResponseGenerator(err)
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({
    description:
      'Retrieves an AVN Transaction. Used to check the status of Minting an NFT.',
    type: AvnNftTransaction
  })
  @Get(':requestId')
  async getAvnTransaction(@Param('requestId') requestId: string) {
    try {
      const transaction =
        await this.avnTransactionService.getAvnTransactionByRequestId(requestId)

      if (transaction) {
        return transaction
      }

      throw new NotFoundException('AVN transaction not found')
    } catch (err) {
      this.log.error(`[getAvnTransaction] cannot get AVN transaction: `, err)
      errorResponseGenerator(err)
    }
  }
}
