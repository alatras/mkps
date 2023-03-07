import { UnprocessableEntityException } from '@nestjs/common'
import { ListNftDto } from '../nft/dto/list-nft.dto'
import { Currency } from '../shared/enum'

/**
 * Validate listing price for NFT or Edition if currency is not ETH.
 * Valid: (123), (12345678), (99999999)
 * Invalid: (123,456,78), (123456.78), (100000000)
 */
export const validateListingPrice = (listNftDto: ListNftDto): void => {
  if (listNftDto.currency === Currency.ETH) {
    return
  }

  const AMOUNT_LIMIT = 99999999
  const AMOUNT_FORMAT = /^[0-9]+$/

  if (!AMOUNT_FORMAT.test(listNftDto.reservePrice)) {
    throw new UnprocessableEntityException('Invalid amount format.')
  }

  const value = Number(listNftDto.reservePrice)

  if (
    (listNftDto.currency === Currency.USD && value > AMOUNT_LIMIT) ||
    value < 0
  ) {
    throw new UnprocessableEntityException(
      `Amount out of limit. Max: ${AMOUNT_LIMIT}. Min: 0.`
    )
  }
}
