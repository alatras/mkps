import { AvnTransactionModule } from '../src/avn-transaction/avn-transaction.module'
import { EditionModule } from '../src/edition/edition.module'
import { NftModule } from '../src/nft/nft.module'
import { EditionListingModule } from '../src/edition-listing/edition-listing.module'
import { UserModule } from '../src/user/user.module'

export enum Microservices {
  AVN = 'AVN_SERVICE',
  NFT = 'NFT_SERVICE',
  LISTING = 'LISTING_SERVICE',
  USER = 'USER_SERVICE'
}

const AVN_SERVICE_IMPORTS = [AvnTransactionModule]
const NFT_SERVICE_IMPORTS = [NftModule, EditionModule]
const LISTING_SERVICE_IMPORTS = [EditionListingModule]
const USER_SERVICE_IMPORTS = [UserModule]

const importsPerService = {
  [Microservices.AVN]: AVN_SERVICE_IMPORTS,
  [Microservices.NFT]: NFT_SERVICE_IMPORTS,
  [Microservices.LISTING]: LISTING_SERVICE_IMPORTS,
  [Microservices.USER]: USER_SERVICE_IMPORTS
}

export const getActiveMicroservices = () => {
  if (!process.env.ACTIVE_SERVICES) {
    throw new Error('ACTIVE_SERVICES env var not set!')
  }

  return process.env.ACTIVE_SERVICES.split(',')
    .map(service => {
      if (!Object.values(Microservices).includes(service as Microservices)) {
        throw new Error(
          `ACTIVE_SERVICES env var invalid: please replace '${service}' with a valid service name`
        )
      }

      return importsPerService[service]
    })
    .flat()
}
