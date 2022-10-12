import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../user/schemas/user.schema'
import { getMockUser } from '../user/test/mocks'
import { NftService } from '../nft/nft.service'
import { UserService } from '../user/user.service'
import { AvnTransactionController } from './avn-transaction.controller'
import { AvnTransactionService } from './avn-transaction.service'
import { AvnTransaction } from './schemas/avn-transaction.schema'
import { getAvnTransaction } from './test/mocks'
import { Nft } from '../nft/schemas/nft.schema'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition,
  NftMock,
} from '../nft/test/mocks'
import { NftHistory } from '../nft/schemas/nft-history.schema'
import { EditionService } from '../edition/edition.service'
import { NftEdition } from '../edition/schemas/edition.schema'
import { EditionListingService } from '../edition-listing/edition-listing.service'
import { EditionListing } from '../edition-listing/schemas/edition-listing.schema'
import { LogService } from '../log/log.service'

describe('AvnTransactionController', () => {
  let controller: AvnTransactionController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        AvnTransactionService,
        UserService,
        NftService,
        EditionService,
        EditionListingService,
        { provide: getModelToken(User.name), useValue: getMockUser() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        { provide: getModelToken(Nft.name), useValue: new NftMock(getMockNft()) },
        { provide: getModelToken(NftHistory.name), useValue: getMockNftHistory() },
        { provide: getModelToken(AvnTransaction.name), useValue: getAvnTransaction() },
        { provide: getModelToken(EditionListing.name), useValue: getEditionListing() },
      ],
      controllers: [
        AvnTransactionController,
      ],
    }).compile()

    controller = module.get<AvnTransactionController>(AvnTransactionController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
