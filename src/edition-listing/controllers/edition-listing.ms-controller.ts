import { Controller, Logger } from '@nestjs/common'
import { Payload, MessagePattern } from '@nestjs/microservices'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { EditionListingService } from '../services/edition-listing.service'
import { EditionListingStatus } from '../../shared/enum'
import { errorResponseGenerator } from '../../core/errors/error-response-generator'

@Controller()
export class EditionListingMsController {
  private logger = new Logger(EditionListingMsController.name)

  constructor(private readonly editionListingService: EditionListingService) {}

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
      this.logger.error('cannot get previous listings for Edition:', err)
      errorResponseGenerator(err)
    }
  }
}
