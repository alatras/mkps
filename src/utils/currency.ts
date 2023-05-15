import { Logger } from '@nestjs/common'
import { Currency } from '../shared/enum'
import { formatUnits } from 'ethers/lib/utils'

const logger = new Logger('utils/currency')

const currencyToSymbolMap = {
  [Currency.NONE]: '',
  [Currency.ADA]: 'ADA',
  [Currency.ETH]: 'ETH',
  [Currency.USD]: '$'
}

export const CURRENCY_DEFINITION = {
  // https://github.com/CYBAVO/SOFA_MOCK_SERVER#currency-definition
  [Currency.NONE]: 0,
  [Currency.ADA]: 6,
  [Currency.ETH]: 18,
  [Currency.USD]: 2
}

const currencyDecimals: Record<Currency, number | undefined> = {
  [Currency.NONE]: undefined,
  [Currency.ETH]: undefined,
  [Currency.ADA]: 0,
  [Currency.USD]: 2
}

export const formatCurrency = (amount: string, currency: Currency): string => {
  if (currency === 'NONE' || amount === '0') return '0.00'

  let formatted = ''
  try {
    formatted = formatUnits(amount, CURRENCY_DEFINITION[currency])
  } catch (e) {
    logger.error(`formatCurrency - cannot format ${amount} for ${currency}`, e)
    return ''
  }

  const decimals = currencyDecimals[currency]

  if (formatted != '' && decimals !== undefined) {
    return parseFloat(formatted).toFixed(decimals)
  } else {
    // formatUnits always add a trailing .0, for whole
    // numbers, we want to remove it
    // check if there's an empty decimal e.g. 13.0
    if (formatted.endsWith('.0')) {
      return formatted.slice(0, -2)
    }
  }

  return formatted
}

export const formatCurrencyWithSymbol = (
  amount: string,
  currency: Currency
): string => {
  const formatters = {
    [Currency.NONE]: (value: string) =>
      `${currencyToSymbolMap[Currency.USD]}${value}`,
    [Currency.ADA]: (value: string) =>
      `${value} ${currencyToSymbolMap[Currency.ADA]}`,
    [Currency.ETH]: (value: string) =>
      `${value} ${currencyToSymbolMap[Currency.ETH]}`,
    [Currency.USD]: (value: string) =>
      `${currencyToSymbolMap[Currency.USD]}${value}`
  }

  const formatted = formatCurrency(amount, currency)

  return formatters[currency](formatted)
}
