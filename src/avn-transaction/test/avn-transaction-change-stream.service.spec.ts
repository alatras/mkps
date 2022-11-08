import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { User } from '../../user/schemas/user.schema'
import { NftService } from '../../nft/services/nft.service'
import { getMockUser } from '../../user/test/mocks'
import { UserService } from '../../user/user.service'
import {
  AvnEditionTransaction,
  AvnNftTransaction
} from '../schemas/avn-transaction.schema'
import { getAvnTransaction } from './mocks'
import { Nft } from '../../nft/schemas/nft.schema'
import {
  getEditionListing,
  getMockNft,
  getMockNftHistory,
  getNftEdition,
  NftMock
} from '../../nft/test/mocks'
import { NftHistory } from '../../nft/schemas/nft-history.schema'
import { EditionService } from '../../edition/edition.service'
import { NftEdition } from '../../edition/schemas/edition.schema'
import { EditionListingService } from '../../edition-listing/edition-listing.service'
import { EditionListing } from '../../edition-listing/schemas/edition-listing.schema'
import { AvnTransactionChangeStreamService } from '../services/avn-transaction-change-stream.service'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { LogService } from '../../log/log.service'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('AvnTransactionChangeStreamService', () => {
  let service: AvnTransactionChangeStreamService
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let testClientProxy

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        AvnTransactionChangeStreamService,
        AvnTransactionService,
        NftService,
        LogService,
        EditionService,
        ConfigService,
        EditionListingService,
        {
          provide: 'TRANSPORT_CLIENT',
          useFactory: () => ClientProxyMock()
        },
        { provide: getModelToken(User.name), useValue: getMockUser() },
        {
          provide: getModelToken(AvnNftTransaction.name),
          useValue: getAvnTransaction()
        },
        {
          provide: getModelToken(AvnEditionTransaction.name),
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

    testClientProxy = await module.get('TRANSPORT_CLIENT')

    service = module.get<AvnTransactionChangeStreamService>(
      AvnTransactionChangeStreamService
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
