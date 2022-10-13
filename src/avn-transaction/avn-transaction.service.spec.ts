import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../user/schemas/user.schema'
import { NftService } from '../nft/nft.service'
import { getMockUser } from '../user/test/mocks'
import { UserService } from '../user/user.service'
import { AvnTransactionService } from './avn-transaction.service'
import { AvnTransaction } from './schemas/avn-transaction.schema'
import { getAvnTransaction } from './test/mocks'
import { Nft } from '../nft/schemas/nft.schema'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition,
  NftMock
} from '../nft/test/mocks'
import { NftHistory } from '../nft/schemas/nft-history.schema'
import { EditionService } from '../edition/edition.service'
import { NftEdition } from '../edition/schemas/edition.schema'
import { EditionListingService } from '../edition-listing/edition-listing.service'
import { EditionListing } from '../edition-listing/schemas/edition-listing.schema'

describe('AvnTransactionService', () => {
  let service: AvnTransactionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        AvnTransactionService,
        NftService,
        EditionService,
        EditionListingService,
        { provide: getModelToken(User.name), useValue: getMockUser() },
        {
          provide: getModelToken(AvnTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ]
    }).compile()

    service = module.get<AvnTransactionService>(AvnTransactionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
