import { Controller } from '@nestjs/common'
import { LoggerService } from '@nestjs/common'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { LogService } from '../../log/log.service'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { EditionListingService } from '../services/edition-listing.service'
import { EditionListingStatus } from '../../shared/enum'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'

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
    } catch (err) {
      this.log.error(
        '[getPreviousListingForEdition] cannot get previous listings for Edition:',
        err
      )
      errorResponseGenerator(err)
    }
  }
}
