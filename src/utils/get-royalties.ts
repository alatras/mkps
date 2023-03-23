import { InternalServerErrorException } from '@nestjs/common'
import {
  Royalties,
  RoyaltyRate
} from '../avn-transaction/schemas/avn-transaction.schema'

export function getDefaultRoyalties(): Royalties[] {
  try {
    const decodedRoyalties = Buffer.from(
      process.env.ROYALTIES ?? '',
      'base64'
    ).toString('ascii')

    const royalties = JSON.parse(decodedRoyalties)

    if (Array.isArray(royalties)) {
      return royalties.map(
        r =>
          <Royalties>{
            recipient_t1_address: r.recipient_t1_address,
            rate: <RoyaltyRate>{
              parts_per_million: r.rate.parts_per_million
            }
          }
      )
    }

    return [
      <Royalties>{
        recipient_t1_address: royalties.recipient_t1_address,
        rate: <RoyaltyRate>{
          parts_per_million: royalties.rate.parts_per_million
        }
      }
    ]
  } catch (e) {
    throw new InternalServerErrorException(
      `avn-service - invalid ROYALTIES value specified in config: ${e.toString()}`
    )
  }
}

/**
 * Get NFT Royalties.
 * This starts with the default royalties and updates
 * them if the NFT has royalties.
 * @param nft NFT
 */
export function getNftRoyalties(nftRoyaltiesNumber: number): Royalties[] {
  const royalties: Royalties[] = getDefaultRoyalties()
  if (!nftRoyaltiesNumber) {
    return royalties
  }

  royalties.forEach(royalty => {
    if (nftRoyaltiesNumber >= 0) {
      royalty.rate.parts_per_million = nftRoyaltiesNumber * 10000
    }
  })

  return royalties
}
