import { Controller } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { LogService } from '../../log/log.service'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { EditionListingService } from '../services/edition-listing.service'
import { EditionListingStatus } from '../../shared/enum'

@Controller()
export class EditionListingMsController {
  private log: LoggerService

  constructor(
    private readonly editionListingService: EditionListingService,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  @MessagePattern(
    MessagePatternGenerator('editionListing', 'getPreviousListingForEdition')
  )
  async getPreviousListingForEdition(
    @Payload() payload: { editionId: string; status?: EditionListingStatus }
  ) {
    try {
      return await this.editionListingService.getPreviousListingForEdition(
        payload.editionId,
        payload.status
      )
    } catch (e) {
      this.log.error(e)
    }
  }
}
