import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ClientProxy } from '@nestjs/microservices'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import { ethers } from 'ethers'
import { Binary } from 'mongodb'
import {
  AuctionType,
  AvnTransactionState,
  AvnTransactionType,
  NftStatus
} from '../shared/enum'
import { EditionListingStatus } from '../shared/enum'
import { NftEdition } from './schemas/edition.schema'
import { Nft } from '../nft/schemas/nft.schema'
import { uuidFrom } from '../utils'
import { CreateEditionDto, EditionResponseDto } from './dto/edition.dto'
import { v4 } from 'uuid-mongodb'
import { User } from '../user/schemas/user.schema'
import { DataWrapper } from '../common/dataWrapper'
import { MessagePatternGenerator } from '../utils/message-pattern-generator'
import { getDefaultRoyalties } from '../utils/get-royalties'
import {
  AvnCreateBatchTransaction,
  AvnEditionTransaction
} from '../avn-transaction/schemas/avn-transaction.schema'
import { firstValueFrom } from 'rxjs'
import { NftDraftModel } from '../nft/schemas/nft-draft-model'

@Injectable()
export class EditionService {
  private logger = new Logger(EditionService.name)

  constructor(
    @InjectModel(NftEdition.name) private nftEditionModel: Model<NftEdition>,
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    @InjectModel(AvnEditionTransaction.name)
    private avnTransaction: Model<AvnEditionTransaction>,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {}

  async getEditionById(editionId: MUUID.MUUID): Promise<NftEdition> {
    return await this.nftEditionModel.findOne({ _id: editionId })
  }

  /**
   * Update Edition's available count and owned count
   * after an NFT is minted.
   */
  async updateEditionCounts(editionId: string) {
    const previousEditionListing = await this.getPreviousListingForEdition(
      editionId,
      EditionListingStatus.open
    )

    const availableStatuses = [NftStatus.forSale]

    if (previousEditionListing) {
      availableStatuses.push(NftStatus.minted)
    }

    let availableCount = await this.nftModel.countDocuments({
      editionId: editionId,
      status: { $in: availableStatuses }
    })

    const ownedCount = await this.nftModel.countDocuments({
      editionId: editionId,
      status: { $in: [NftStatus.owned, NftStatus.saleClosing] }
    })

    if (previousEditionListing?.pendingEthereumTransactions) {
      availableCount =
        availableCount -
        previousEditionListing.pendingEthereumTransactions.length
    }

    if (previousEditionListing?.pendingBuyers) {
      availableCount =
        availableCount - previousEditionListing.pendingBuyers.length
    }

    await this.nftEditionModel.updateOne(
      { _id: uuidFrom(editionId) },
      {
        $set: {
          availableCount: Math.max(availableCount, 0),
          ownedCount: Math.max(ownedCount, 0),
          updatedAt: new Date()
        }
      }
    )
  }

  /**
   * Mints an Edition
   */
  async mintEdition(
    createEditionDto: CreateEditionDto,
    user: User
  ): Promise<DataWrapper<EditionResponseDto>> {
    const foundUser = await this.getUser(MUUID.from(user._id))
    if (!foundUser.avnPubKey) {
      throw new BadRequestException('User without an AVN key cannot mint')
    }

    const createdEdition: NftEdition = await this.createEdition(
      createEditionDto,
      user
    )

    const requestId = `${
      AvnTransactionType.AvnCreateBatch
    }:${createdEdition._id.toString()}`

    await this.createAvnBatchTransaction(createdEdition, user, requestId)

    return { data: { requestId, id: createdEdition._id.toString() } }
  }

  /**
   * Creates Edition in DB based on Edition input (DTO) and User
   */
  private async createEdition(
    createEditionDto: CreateEditionDto,
    user: User
  ): Promise<NftEdition> {
    const editionOfName = await this.findEditionByName(createEditionDto.name)
    if (editionOfName.length > 0) {
      throw new ConflictException('Edition name already exists')
    }

    const { quantity: _, ...nftDraftContract } = createEditionDto

    // Get nftDoc via client proxy
    let nftDoc: NftDraftModel
    try {
      nftDoc = await firstValueFrom(
        this.clientProxy.send(
          MessagePatternGenerator('nft', 'mapNftDraftToModel'),
          {
            nftDraftContract,
            user
          }
        )
      )
    } catch (err) {
      const message = `failed to create Edition NFT: ${
        createEditionDto.name
      }, ${JSON.stringify(err)}`
      this.logger.error(
        `[createEdition] ${message} ${JSON.stringify(createEditionDto)}`
      )
      throw new InternalServerErrorException(message)
    }

    const editionDoc: NftEdition = {
      _id: v4(),
      name: createEditionDto.name,
      description: createEditionDto.description,
      quantity: createEditionDto.quantity,
      availableCount: 0,
      listingIndex: 0,
      ownedCount: 0,
      isHidden: true,
      status: NftStatus.minted,
      nfts: [],
      listingType: AuctionType.fixedPrice,
      owner: { _id: user._id, avnPubKey: user.avnPubKey },
      image: createEditionDto.image,
      properties: nftDoc.properties,
      unlockableContent: nftDoc.unlockableContent
    }

    const createdEdition: NftEdition = await this.nftEditionModel.create(
      editionDoc
    )
    if (!createdEdition) {
      this.logger.error(
        'creating Edition failed to create Edition:',
        createEditionDto.name
      )
      throw new InternalServerErrorException('cannot create Edition')
    }

    return createdEdition
  }

  /**
   * Creates AVN transaction in DB based on Edition model and User
   */
  private async createAvnBatchTransaction(
    edition: NftEdition,
    minter: User,
    requestId: string
  ): Promise<AvnEditionTransaction> {
    const avnTransactionDoc: AvnCreateBatchTransaction = {
      request_id: requestId,
      type: AvnTransactionType.AvnCreateBatch,
      data: {
        totalSupply: edition.quantity,
        userId: minter._id,
        royalties: getDefaultRoyalties()
      },
      state: AvnTransactionState.NEW,
      history: []
    }

    const createdAvnTransaction = await this.avnTransaction.create(
      avnTransactionDoc
    )
    if (!createdAvnTransaction) {
      this.logger.error(
        'failed to create AVN transaction for Edition: ' +
          edition.name +
          ', user: ' +
          avnTransactionDoc.data.userId
      )
      throw new InternalServerErrorException('cannot create AVN transaction')
    }

    return createdAvnTransaction
  }

  /**
   * Find Edition by name for verification.
   */
  private async findEditionByName(name: string): Promise<NftEdition[]> {
    return this.nftEditionModel
      .find({ name: { $regex: new RegExp(name, 'i') } })
      .limit(20)
      .lean()
  }

  /**
   * Get user from User Service via Redis.
   */
  private async getUser(userId: MUUID.MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'getUserById'), {
        userId: userId.toString()
      })
    )
  }

  /**
   * Get previous EditionListing for a given Edition via Redis
   */
  private async getPreviousListingForEdition(
    editionId: string,
    status?: EditionListingStatus
  ) {
    return await firstValueFrom(
      this.clientProxy.send(
        MessagePatternGenerator(
          'editionListing',
          'getPreviousListingForEdition'
        ),
        {
          editionId,
          status
        }
      )
    )
  }

  async updateOneById(
    id: string,
    updatedValues: Partial<NftEdition>
  ): Promise<NftEdition> {
    return this.nftEditionModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      { $set: updatedValues },
      { new: true }
    )
  }

  /**
   * Handles updating Edition after AVN minting succeed.
   */
  async handleEditionMinted(editionId: string, batchId: string) {
    const updatedEdition: NftEdition = await this.updateOneById(editionId, {
      status: NftStatus.minted,
      avnId: batchId
    })

    const editionNftIds: MUUID.MUUID[] = []

    await Promise.all(
      [...Array(updatedEdition!.quantity)].map(async (_, index) => {
        const _id = this.generateNftId(batchId, index + 1)

        // Create NFT
        try {
          await firstValueFrom(
            this.clientProxy.send(MessagePatternGenerator('nft', 'createNft'), {
              nft: {
                ...updatedEdition,
                _id,
                description: updatedEdition.description,
                editionNumber: index + 1,
                image: updatedEdition.image,
                owner: updatedEdition.owner,
                minterId: updatedEdition.owner._id,
                editionId: uuidFrom(editionId)
              },
              status: NftStatus.minted
            })
          )
        } catch (err) {
          const message = `failed to create NFT: ${_id}. Error: ${JSON.stringify(
            err
          )}`
          this.logger.error(
            `[createNft] ${message}. Edition: ${JSON.stringify(updatedEdition)}`
          )
          throw new InternalServerErrorException(message)
        }

        editionNftIds.push(_id)
      })
    )

    await this.updateOneById(editionId, { nfts: editionNftIds })
  }

  /**
   * Generates a UUID using the batchId and editionNumber.
   * @param {string} batchId - The batchId of the NFT.
   * @param {number} editionNumber - The edition number of the NFT.
   */
  private generateNftId(batchId: string, editionNumber: number): MUUID.MUUID {
    const prefix = 'B'
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['string', 'uint256', 'uint64'],
      [prefix, batchId, editionNumber]
    )
    // Hash the data. This function returns a string prefixed with 0x
    const hash: string = ethers.utils.keccak256(encodedData)
    // Take the first 16 bytes, including 0x
    const uuidCompatibleHash = hash.substring(0, 34)
    // The input to this function must start with 0x
    const hashBuffer = ethers.utils.arrayify(uuidCompatibleHash)
    // Generate the final UUID
    return uuidFrom(new Binary(hashBuffer, Binary.SUBTYPE_UUID))
  }
}
