import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import { InvalidDataError } from '../../core/errors'
import {
  AvnMintTransaction,
  AvnMintTransactionData,
  AvnTransaction,
  Royalties,
  RoyaltyRate
} from '../schemas/avn-transaction.schema'
import { User } from '../../user/schemas/user.schema'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { NftService } from '../../nft/services/nft.service'
import { uuidFrom } from '../../utils'
import { AvnTransactionMintResponse } from '../response/anv-transaction-mint-response'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'

@Injectable()
export class AvnTransactionService {
  private mUUID: any

  constructor(
    @InjectModel(AvnTransaction.name)
    private avnTransactionModel: Model<AvnTransaction>,
    private nftService: NftService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.mUUID = MUUID.mode('relaxed')
  }

  /**
   * Create a new doc in AvnTransactions collection to mint NFT.
   * Notify Aventus to listed the NFT and create a Proof.
   * The Proof will be used to create a auction in Ethereum.
   *
   * @returns New AvnTransaction
   */
  async createMintAvnTransaction(
    nftUuid: string
  ): Promise<AvnTransactionMintResponse | Error> {
    const nft = await this.nftService.findOneById(nftUuid)
    if (!nft) {
      throw new NotFoundException('NFT not found')
    }

    const user: User = await this.getUser(this.mUUID.from(nft.owner._id))
    if (!user) {
      throw new NotFoundException('NFT user not found')
    }
    if (!user.avnPubKey) {
      throw new InvalidDataError('ANV public key is not set for user')
    }

    const royalties: Royalties[] = this.getRoyalties()

    const data: AvnMintTransactionData = {
      unique_external_ref: nftUuid,
      userId: uuidFrom(user._id as MUUID.MUUID),
      royalties
    }

    const newDoc: AvnMintTransaction = {
      request_id: `avnMint:${nftUuid}`,
      type: AvnTransactionType.MintSingleNft,
      data: data,
      state: AvnTransactionState.NEW,
      history: []
    }

    return await this.avnTransactionModel.create(newDoc)
  }

  private async getUser(userId: MUUID.MUUID): Promise<User> {
    return new Promise(resolve => {
      this.clientProxy
        .send(MessagePatternGenerator('user', 'getUserById'), {
          userId: userId.toString()
        })
        .subscribe((user: User) => resolve(user))
    })
  }

  private getRoyalties(): Royalties[] {
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
      throw new Error(
        `avn-service - invalid ROYALTIES value specified in config: ${e.toString()}`
      )
    }
  }

  getAvnTransactionByRequestId = async (
    requestId: string
  ): Promise<AvnTransaction | null> => {
    return await this.avnTransactionModel.findOne({ request_id: requestId })
  }
}
