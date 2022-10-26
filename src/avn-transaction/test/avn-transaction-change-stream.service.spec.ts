import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { User } from '../../user/schemas/user.schema'
import { NftService } from '../../nft/services/nft.service'
import { getMockUser } from '../../user/test/mocks'
import { UserService } from '../../user/user.service'
import { AvnTransaction } from '../schemas/avn-transaction.schema'
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
import { AvnTransactionType } from '../../shared/enum'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { AvnTransactionService } from '../services/avn-transaction.service'
import { LogService } from '../../log/log.service'
import { ConfigService } from '@nestjs/config'

const ClientProxyMock = () => ({
  emit: jest.fn(),
  send: jest.fn()
})

describe('AvnTransactionChangeStreamService', () => {
  let service: AvnTransactionChangeStreamService
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

    testClientProxy = await module.get('TRANSPORT_CLIENT')

    service = module.get<AvnTransactionChangeStreamService>(
      AvnTransactionChangeStreamService
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sendMintingSuccessfulEvent', () => {
    it('should call clientProxy.emit with the correct avnTransaction data', async () => {
      const testAvnTransaction = getAvnTransaction(
        avn => avn.type === AvnTransactionType.MintSingleNft
      )

      await service.sendMintingSuccessfulEvent(testAvnTransaction)

      expect(testClientProxy.emit).toBeCalledWith(
        MessagePatternGenerator('nft', 'handleNftMinted'),
        {
          nftId: testAvnTransaction.data.unique_external_ref,
          eid: testAvnTransaction.history[testAvnTransaction.history.length - 1]
            .operation_data.nftId
        }
      )
    })
  })
})
