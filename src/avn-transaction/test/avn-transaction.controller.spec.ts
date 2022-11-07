import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../../user/schemas/user.schema'
import { getMockUser } from '../../user/test/mocks'
import { NftService } from '../../nft/services/nft.service'
import { UserService } from '../../user/user.service'
import { AvnTransactionHttpController } from '../controllers/avn-transaction.http-controller'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { AvnEditionTransaction, AvnNftTransaction } from '../schemas/avn-transaction.schema'
import { getAvnTransaction } from './mocks'
import { Nft } from '../../nft/schemas/nft.schema'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition,
  NftMock
} from '../../nft/test/mocks'
import { ConfigService } from '@nestjs/config'
import { NftHistory } from '../../nft/schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { LogService } from '../../log/log.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('AvnTransactionController', () => {
  let controller: AvnTransactionHttpController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        LogService,
        AvnTransactionService,
        UserService,
        NftService,
        EditionService,
        EditionListingService,
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        { provide: getModelToken(User.name), useValue: getMockUser() },
        { provide: getModelToken(NftEdition.name), useValue: getNftEdition() },
        {
          provide: getModelToken(Nft.name),
          useValue: new NftMock(getMockNft())
        },
        {
          provide: getModelToken(NftHistory.name),
          useValue: getMockNftHistory()
        },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(EditionListing.name),
          useValue: getEditionListing()
        }
      ],
      controllers: [AvnTransactionHttpController]
    }).compile()

    controller = module.get<AvnTransactionHttpController>(
      AvnTransactionHttpController
    )
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
