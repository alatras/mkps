import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { presignedGetUrlResponseMock } from './mocks'
import { AssetService } from '../services/asset.service'

describe('AssetService', () => {
  let service: AssetService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetService, ConfigService]
    }).compile()

    service = module.get<AssetService>(AssetService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('getPresignedUrl methods should return correct response', async () => {
    jest
      .spyOn(AssetService.prototype as any, 'getPresignedPostRequest')
      .mockImplementation(() =>
        Promise.resolve({
          url: presignedGetUrlResponseMock.data.url,
          fields: presignedGetUrlResponseMock.data.fields
        })
      )

    jest
      .spyOn(AssetService.prototype as any, 'getPresignedGetUrl')
      .mockImplementation(() =>
        Promise.resolve(presignedGetUrlResponseMock.data.presignedGetUrl)
      )

    jest
      .spyOn(ConfigService.prototype as any, 'get')
      .mockImplementation(() => 'ave-nft-assets-dev')

    const res1 = await service.getPresignedUrlForSmallImage(
      'dummyContentType',
      'dummyNftName'
    )
    const fileName1 = res1.data['fileName']
    delete res1.data['fileName']
    expect(res1).toEqual(presignedGetUrlResponseMock)
    expect(typeof fileName1).toBe('string')

    const res2 = await service.getPresignedUrlForOriginal(
      'dummyContentType',
      'dummyNftName'
    )
    const fileName2 = res2.data['fileName']
    delete res2.data['fileName']
    expect(res2).toEqual(presignedGetUrlResponseMock)
    expect(typeof fileName2).toBe('string')
  })
})
