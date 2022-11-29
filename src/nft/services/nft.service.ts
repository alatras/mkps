import {
  BadGatewayException,
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  LoggerService
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model } from 'mongoose'
import { CreateNftDto, CreateNftResponseDto } from '../dto/nft.dto'
import { Nft, UnlockableContent } from '../schemas/nft.schema'
import { EditionService } from '../../edition/edition.service'
import { NftHistory } from '../schemas/nft-history.schema'
import { HistoryType } from '../../shared/enum'
import { uuidFrom } from '../../utils'
import { CreateNftHistoryDto } from '../dto/nft-history.dto'
import { NftStatus } from '../../shared/enum'
import { MUUID, v4 } from 'uuid-mongodb'
import { NftWithEdition } from '../schemas/nft-with-edition'
import { NftDraftContract } from '../schemas/nft-draft-contract'
import { User } from '../../user/schemas/user.schema'
import { NftDraftModel } from '../schemas/nft-draft-model'
import { getNftProperties } from '../../utils/nftProperties'
import { ImagesSet } from '../schemas/asset.schema'
import { AvnTransactionService } from '../../avn-transaction/services/avn-transaction.service'
import { firstValueFrom } from 'rxjs'
import { MessagePatternGenerator } from '../../utils/message-pattern-generator'
import { ClientProxy } from '@nestjs/microservices'
import { LogService } from '../../log/log.service'

@Injectable()
export class NftService {
  private log: LoggerService

  constructor(
    @InjectModel(Nft.name) private nftModel: Model<Nft>,
    @InjectModel(NftHistory.name) private nftHistoryModel: Model<NftHistory>,
    private readonly avnTransactionService: AvnTransactionService,
    @Inject(forwardRef(() => EditionService))
    private editionService: EditionService,
    @Inject('TRANSPORT_CLIENT') private clientProxy: ClientProxy,
    private logService: LogService
  ) {
    this.log = this.logService.getLogger()
  }

  async create(
    userId: MUUID,
    createNftDto: CreateNftDto
  ): Promise<CreateNftResponseDto> {
    const minterUser: User = await this.getUser(userId)

    const newNft: NftDraftModel = {
      ...createNftDto,
      isHidden: true,
      ...(createNftDto.owner
        ? {
            owner: {
              _id: uuidFrom(userId),
              avnPubKey: createNftDto.owner.avnPubKey,
              username: createNftDto.owner.username
            }
          }
        : {
            owner: {
              _id: uuidFrom(userId),
              avnPubKey: minterUser.avnPubKey,
              username: minterUser.username
            }
          }),
      status: NftStatus.draft,
      minterId: uuidFrom(userId)
    }

    try {
      this.validateNftProperties(newNft)
    } catch (e) {
      this.log.error(e)
      throw new BadRequestException('Missing properties: ' + e.message)
    }

    const nft = await this.createNft(newNft)

    const mint = await this.avnTransactionService.createMintAvnTransaction(
      nft._id.toString()
    )

    return { requestId: mint.request_id }
  }

  async findOneById(id: string): Promise<Nft> {
    return this.nftModel.findOne({ _id: uuidFrom(id) }).lean()
  }

  async updateOneById(id: string, updatedValues: Partial<Nft>): Promise<Nft> {
    return this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      {
        $set: {
          ...updatedValues,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )
  }

  async countNfts(filter: Record<string, any>): Promise<number> {
    return this.nftModel.countDocuments(filter)
  }

  async setStatusToNft(id: string, status: NftStatus): Promise<Nft> {
    const nft = await this.nftModel.findOneAndUpdate(
      { _id: uuidFrom(id) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    )

    // if the NFT is part of an edition
    // we want to recalculate the counts of that edition
    if (
      nft &&
      nft.editionId &&
      ![NftStatus.draft, NftStatus.minting].includes(status)
    ) {
      await this.editionService.updateEditionCounts(nft.editionId.toString())
    }

    return nft
  }

  async addHistory(historyParams: CreateNftHistoryDto): Promise<void> {
    const history = historyParams.transactionHash
      ? await this.nftHistoryModel.findOne({
          transactionHash: historyParams.transactionHash
        })
      : null

    if (!history) {
      await this.nftHistoryModel.create({
        ...historyParams
      })

      return
    }

    await this.nftHistoryModel.updateOne(
      { transactionHash: historyParams.transactionHash },
      { $set: { ...historyParams } }
    )
  }

  async handleNftMinted(nftId: string, eid: string) {
    const nft: Nft = await this.updateOneById(nftId, {
      eid,
      status: NftStatus.minted
    })

    await this.addHistory({
      nftId: nftId,
      userAddress: nft.owner.avnPubKey,
      type: HistoryType.minted
    })
  }

  async getNftsOfEdition(
    id: string,
    limit = 20,
    offset = 0,
    filter?: FilterQuery<Nft>,
    sort?: string | any
  ): Promise<NftWithEdition[]> {
    const nfts = await this.nftModel
      .find({ ...filter, editionId: id })
      .sort(sort)
      .skip(offset)
      .limit(limit)

    return nfts.map((n: Nft) => n as NftWithEdition)
  }

  /**
   * Maps NFT draft coming from request into NFT draft model.
   * ُEdition mint handler calls this validation.
   */
  async mapNftDraftToModel(
    contract: NftDraftContract,
    owner: User
  ): Promise<NftDraftModel> {
    const { id, ...rest } = contract
    const image = contract.image

    let unlockableContent: UnlockableContent
    if (id) {
      unlockableContent = (await this.findOneById(id))?.unlockableContent
    } else if (contract.unlockableContent) {
      unlockableContent = { ...contract.unlockableContent, claimedCount: 0 }
    }

    const ownerId = uuidFrom(owner._id)

    return {
      ...rest,
      _id: id ? uuidFrom(id) : v4(),
      owner: {
        avnPubKey: owner.avnPubKey ?? null,
        _id: ownerId
      },
      image,
      isHidden: true, // Default draft NFT to hidden
      minterId: ownerId,
      unlockableContent
    }
  }

  /**
   * Validates that required properties in an NFT
   * to be created are present.
   */
  validateNftProperties(nftDraftModel: NftDraftModel): void {
    const enabledNftProperties: string[] = getNftProperties().reduce(
      (values, prop) =>
        prop.required && prop.key !== 'quantity'
          ? [...values, prop.key]
          : values,
      []
    )

    // TODO: replace this with a @Pipe() validator in the NFT DTO class.
    if (
      !enabledNftProperties.every(prop =>
        Object.keys(
          prop === 'name' ? nftDraftModel : nftDraftModel.properties
        ).includes(prop)
      )
    ) {
      throw new Error(
        `Nft Properties must include all of the following: "${enabledNftProperties.join(
          '", "'
        )}".`
      )
    }
  }

  async createNft(
    nftDraft: NftDraftModel,
    nftStatus?: NftStatus
  ): Promise<Nft> {
    const { small, large } = nftDraft.image
    if (!small || !large) {
      throw new BadGatewayException('noImages: ' + nftDraft.image)
    }

    const image: ImagesSet = {
      small: nftDraft.image.small,
      large: nftDraft.image.large,
      original: nftDraft.image.original
    }

    for (const key of Object.keys(nftDraft)) {
      if (typeof nftDraft[key] === 'string') {
        nftDraft[key] = `${nftDraft[key]}`.trim()
      }
    }

    const finalDoc: NftDraftModel = {
      ...nftDraft,
      status: nftStatus ?? NftStatus.draft,
      assets: nftDraft.assets || [],
      isHidden: nftDraft.isHidden || true,
      image,
      minterId: nftDraft.owner._id,
      unlockableContent: nftDraft.unlockableContent
        ? { ...nftDraft.unlockableContent, claimedCount: 0 }
        : undefined
    }

    return await this.nftModel.create(finalDoc)
  }

  private async getUser(userId: MUUID): Promise<User> {
    return await firstValueFrom(
      this.clientProxy.send(MessagePatternGenerator('user', 'getUserById'), {
        userId: userId.toString()
      })
    )
  }
}
