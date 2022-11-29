import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { ConfigService } from '@nestjs/config'
import { S3 } from 'aws-sdk'
import slugify from 'slugify'
import { DataWrapper } from '../../common/dataWrapper'
import { PresignedUrlPostRequestDto } from '../dto/presigned-post-request.dto'
import { PresignedUrlResponse } from '../dto/presigned-url-response.dto'
import { removeSpecialCharacters } from '../../utils/remove-special-characters'

@Injectable()
export class AssetService {
  private s3: S3
  private configService: ConfigService

  constructor(configService: ConfigService) {
    this.s3 = new S3({ apiVersion: '2006-03-01' })
    this.configService = configService
  }

  /**
   * Gets presigned URL for small image to upload in 3S
   * @param contentType type of asset file contents
   */
  async getPresignedUrlForSmallImage(
    contentType: string,
    nftName: string
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    const maxBytes = 1000000 // 1 MB
    const fileName = 'previewImage' + nanoid(11)
    const key = `nft/thumb/${nanoid(7)}-${slugify(
      removeSpecialCharacters(nftName)
    )}`
    const bucketName = this.configService.get<string>(
      'app.aws.s3BucketNameAssets'
    )
    if (!bucketName) {
      throw new InternalServerErrorException(
        'missing config of s3BucketNameAssets'
      )
    }

    const presignedReq = await this.getPresignedPostRequest(
      key,
      bucketName,
      maxBytes,
      contentType
    )
    const presignedGetUrl = await this.getPresignedGetUrl(key, bucketName, 900)

    return {
      data: {
        ...presignedReq,
        presignedGetUrl,
        fileName
      }
    }
  }

  /**
   * Get presigned URL for original image to upload in 3S
   * @param contentType type of asset file contents
   */
  async getPresignedUrlForOriginal(
    contentType: string,
    nftName: string
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    const maxBytes = 500000000 // 500 MB
    const fileName = 'originalImage' + nanoid(11)
    const key = `nft/${nanoid(7)}-${slugify(removeSpecialCharacters(nftName))}`
    const bucketName = this.configService.get<string>(
      'app.aws.s3BucketNameUserOrig'
    )
    if (!bucketName) {
      throw new InternalServerErrorException(
        'missing config of s3BucketNameUserOrig'
      )
    }

    const presignedReq = await this.getPresignedPostRequest(
      key,
      bucketName,
      maxBytes,
      contentType
    )
    const presignedGetUrl = await this.getPresignedGetUrl(key, bucketName, 900)

    return {
      data: {
        ...presignedReq,
        presignedGetUrl,
        fileName
      }
    }
  }

  /**
   * Get presigned URL to get a file.
   * @param key key to the file
   * @param bucket bucket where the file exists
   * @param secondsToExpire time in seconds after which url expires, defaults to 1 hour
   */
  private getPresignedGetUrl(
    key: string,
    bucket: string,
    secondsToExpire = 3600
  ): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: secondsToExpire
    })
  }

  /**
   * Get the form fields and target URL for direct POST uploading.
   * @param key key to the file
   * @param bucketName name of bucket where the file exists
   * @param maxBytes maximum asset file size in bytes
   * @param contentType type of asset file contents
   */
  private async getPresignedPostRequest(
    key: string,
    bucketName: string,
    maxBytes: number,
    contentType: string
  ): Promise<PresignedUrlPostRequestDto> {
    return new Promise((resolve, reject) => {
      const s3Params: S3.PresignedPost.Params = {
        Bucket: bucketName,
        Fields: { key },
        Conditions: [
          ['content-length-range', 0, maxBytes],
          ['starts-with', '$Content-Type', contentType]
        ]
      }

      this.s3.createPresignedPost(s3Params, (error, url) => {
        if (error) {
          reject(error)
        } else {
          resolve(url)
        }
      })
    })
  }
}
