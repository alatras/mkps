import { Currency } from '../shared/enum'
import { formatUnits } from 'ethers/lib/utils'

const currencyToSymbolMap = {
  [Currency.NONE]: '',
  [Currency.ADA]: 'ADA',
  [Currency.ETH]: 'ETH',
  [Currency.USD]: '$'
}

export const CURRENCY_DEFINITION = {
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
    /* eslint-disable no-console */
    console.error(`formatCurrency - cannot format ${amount} for ${currency}`, e)
    /* eslint-enable no-console */
    return ''
  }

  const decimals = currencyDecimals[currency]

  if (formatted != '' && decimals !== undefined) {
    return parseFloat(formatted).toFixed(decimals)
  } else {
    if (formatted.endsWith('.0')) {
      return formatted.slice(0, -2)
    }
  }

  return formatted
}

/**
 * Format the given amount with the appropriate currency symbol and returns the result as a string.
 * Ex:
 * '1000000000000000000', Currency.ETH => '1.00 ETH'
 * '12345', Currency.USD => '$123.45'
 * @param amount
 * @param currency
 */
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
