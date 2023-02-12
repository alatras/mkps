import { Inject, Injectable } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
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
import { AvnTransactionApiGatewayService } from './avn-transaction-api-gateway.service'

@Injectable()
export class AvnTransactionService {
  private mUUID: any

  constructor(
    @InjectModel(AvnNftTransaction.name)
    private avnTransactionModel: Model<AvnNftTransaction>,
    private avnTransactionApiGatewayService: AvnTransactionApiGatewayService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.mUUID = MUUID.mode('relaxed')
  }

  /**
   * Create a new doc in AvnTransactions collection to mint NFT.
   * Notify Aventus to listed the NFT and create a Proof.
   * The Proof will be used to create a auction in Ethereum.
   * @param nftId NFT ID
   * @param user Logged in user
   * @returns Avn transaction response
   */
  async createMintAvnTransaction(
    nftId: string,
    user: User
  ): Promise<AvnTransactionMintResponse> {
    const royalties: Royalties[] = getRoyalties()

    const data: AvnMintNFTTransactionData = {
      unique_external_ref:
        this.avnTransactionApiGatewayService.createExternalRef(nftId),
      userId: uuidFrom(user._id as MUUID.MUUID),
      royalties
    }

    const newDoc: AvnMintTransaction = {
      request_id: `avnMint:${nftId}`,
      type: AvnTransactionType.MintSingleNftApiGateway,
      data: data,
      state: AvnTransactionState.NEW,
      history: []
    }

    const avnTransaction = (await this.avnTransactionModel.create(
      newDoc
    )) as AvnTransactionMintResponse

    this.avnTransactionApiGatewayService.mintSingleNft(
      nftId,
      avnTransaction.request_id
    )

    return avnTransaction
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
