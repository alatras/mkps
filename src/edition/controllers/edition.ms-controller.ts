import { Controller, Body } from '@nestjs/common'
import { EventPattern } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { EditionService } from '../edition.service'

@Controller()
export class EditionMsController {
  constructor(private readonly editionService: EditionService) {}

  @EventPattern(MessagePatternGenerator('edition', 'handleEditionMinted'))
  async handleEditionMinted(
    @Body()
    avnTransaction: {
      editionId: string
      batchId: string
    }
  ): Promise<void> {
    await this.editionService.handleEditionMinted(
      avnTransaction.editionId,
      avnTransaction.batchId
    )
  }
}
