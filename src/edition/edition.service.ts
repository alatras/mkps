import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  LoggerService
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ClientProxy } from '@nestjs/microservices'
import { Model } from 'mongoose'
import * as MUUID from 'uuid-mongodb'
import { EditionListingService } from '../edition-listing/edition-listing.service'
import { AuctionType, NftStatus } from '../shared/enum'
import { EditionListingStatus } from '../shared/enum'
import { NftEdition } from './schemas/edition.schema'
import { Nft } from '../nft/schemas/nft.schema'
import { uuidFrom } from '../utils'
import { CreateEditionDto, EditionResponseDto } from './dto/edition.dto'
import { NftService } from '../nft/services/nft.service'
import { v4 } from 'uuid-mongodb'
import { User } from '../user/schemas/user.schema'
import { DataWrapper } from '../common/dataWrapper'
import { LogService } from '../log/log.service'
import { MessagePatternGenerator } from '../utils/message-pattern-generator'

@Injectable()
export class EditionService {
  private log: LoggerService

  constructor(
    @InjectModel(NftEdition.name) private nftEditionModel: Model<NftEdition>,
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    private editionListing: EditionListingService,
    @Inject(forwardRef(() => NftService)) private nftService: NftService,
    private logService: LogService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy
  ) {
    this.log = this.logService.getLogger()
  }

  /**
   * Update Edition's available count and owned count
   * after an NFT is minted.
   */
  async updateEditionCounts(editionId: string) {
    const previousEditionListing =
      await this.editionListing.getPreviousListingForEdition(
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
   * Creates Edition in DB.
   */
  async createEdition(
    createEditionDto: CreateEditionDto,
    user: User
  ): Promise<DataWrapper<EditionResponseDto>> {
    const foundUser = await this.getUser(MUUID.from(user._id))
    if (!foundUser.avnPubKey) {
      throw new Error('User without an AVN key cannot mint')
    }

    const editionWithSameName = await this.findEditionByName(
      createEditionDto.name
    )
    if (editionWithSameName.length > 0) {
      throw new ConflictException('Edition name already exists')
    }

    const { quantity: _, ...nftDraftContract } = createEditionDto

    const nftDoc = await this.nftService.mapNftDraftToModel(
      nftDraftContract,
      user
    )

    try {
      this.nftService.validateNftProperties(nftDoc)
    } catch (e) {
      this.log.error(e)
      throw new BadRequestException('Missing properties: ' + e.message)
    }

    const editionDoc: NftEdition = {
      _id: v4(),
      name: createEditionDto.name,
      quantity: createEditionDto.quantity,
      availableCount: 0,
      listingIndex: 0,
      ownedCount: 0,
      isHidden: true,
      status: NftStatus.minted,
      nfts: [],
      listingType: AuctionType.fixedPrice
    }

    const createdEdition: NftEdition = await this.nftEditionModel.create(
      editionDoc
    )
    if (!createdEdition) {
      this.log.error(
        '[createEdition] failed in creating Edition:',
        createEditionDto.name
      )
      throw new InternalServerErrorException('cannot create Edition')
    }

    return {
      data: this.mapEditionModelToResponse(
        createdEdition,
        NftStatus.minted,
        user
      )
    }
  }

  /**
   * Maps edition model after being created to response object.
   */
  private mapEditionModelToResponse = (
    doc: NftEdition,
    status: NftStatus,
    user: User
  ): EditionResponseDto => {
    const { _id, ...rest } = doc
    return {
      ...rest,
      id: uuidFrom(_id.toString()).toString(),
      status,
      nfts: doc.nfts.map(n => uuidFrom(n.toString()).toString()),
      owner: { _id: user._id, avnPubKey: user.avnPubKey }
    }
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
    return new Promise(resolve => {
      this.clientProxy
        .send(MessagePatternGenerator('user', 'getUserById'), {
          userId: userId.toString()
        })
        .subscribe((user: User) => resolve(user))
    })
  }
}
