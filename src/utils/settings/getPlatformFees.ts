import * as settings from './settings.json'

export interface PlatformFees {
  stripe: number
  ethereum: number
}

const calculateFee = (fee: number, royalties: number): number => {
  if (royalties + fee > 1) {
    return parseFloat((1 - royalties).toFixed(3))
  }
  return fee
}

export const getPlatformFees = (royalties: number): PlatformFees => {
  const { platformFees } = settings

  if (platformFees) {
    return {
      stripe: calculateFee(platformFees.stripe, royalties),
      ethereum: calculateFee(platformFees.ethereum, royalties)
    }
  }

  return platformFees
}
