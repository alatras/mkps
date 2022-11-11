import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import { InvalidDataError } from '../../core/errors'
import {
  AvnMintTransaction,
  AvnMintNFTTransactionData,
  AvnNftTransaction,
  Royalties
} from '../schemas/avn-transaction.schema'
import { User } from '../../user/schemas/user.schema'
import { AvnTransactionState, AvnTransactionType } from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { AvnTransactionMintResponse } from '../response/anv-transaction-mint-response'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { firstValueFrom } from 'rxjs'
import { getRoyalties } from '../../utils/get-royalties'
import { Nft } from '../../nft/schemas/nft.schema'

@Injectable()
export class AvnTransactionService {
  private mUUID: any

  constructor(
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy // private nftService: NftService,
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
  ): Promise<AvnTransactionMintResponse> {
    const nft = await this.getNft(nftUuid)
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

    const royalties: Royalties[] = getRoyalties()

    const data: AvnMintNFTTransactionData = {
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

    return (await this.avnTransactionModel.create(
      newDoc
    )) as AvnTransactionMintResponse
  }

  private async getUser(userId: MUUID.MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'getUserById'), {
        userId: userId.toString()
      })
    )
  }

  /**
   * Get NFT from NFT Service via Redis.
   */
  private async getNft(nftId: string): Promise<Nft> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('nft', 'findOneById'), {
        nftId
      })
    )
  }

  getAvnTransactionByRequestId = async (
    requestId: string
  ): Promise<AvnNftTransaction | null> => {
    return await this.avnTransactionModel.findOne({ request_id: requestId })
  }
}
