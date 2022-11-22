import { Injectable } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { ConfigService } from '@nestjs/config'
import { S3 } from 'aws-sdk'
import slugify from 'slugify'
import { DataWrapper } from '../../common/dataWrapper'
import { PresignedUrlUploadType } from '../../shared/enum'
import { PresignedUrlPostRequestDto } from '../dto/presigned-post-request.dto'
import { PresignedUrlResponse } from '../dto/presigned-url-response.dto'

@Injectable()
export class AssetService {
  private s3: S3
  private configService: ConfigService

  constructor(
    configService: ConfigService,
  ) {
    this.s3 = new S3({ apiVersion: '2006-03-01' })
    this.configService = configService
  }

  /**
   * Gets presigned URL for small image to upload in 3S
   */
  async getPresignedUrlForSmallImage(
    fileName: string,
    contentType: string
  ): Promise<DataWrapper<PresignedUrlResponse>> {
    const maxBytes = 1000000 // 1 MB

    const thumbBucket = this.configService.get<string>('app.aws.s3BucketNameAssets')
    const origBucket = this.configService.get<string>('app.aws.s3BucketNameUserOrig')

    const BucketDestinations: Record<PresignedUrlUploadType, string> = {
      [PresignedUrlUploadType.nftThumbnail]: thumbBucket,
      [PresignedUrlUploadType.nftOriginal]: origBucket
    }

    const filePaths: Record<PresignedUrlUploadType, string> = {
      [PresignedUrlUploadType.nftThumbnail]: 'nft/thumb',
      [PresignedUrlUploadType.nftOriginal]: 'nft'
    }

    const key = `${filePaths[PresignedUrlUploadType.nftThumbnail]}/${nanoid (7)}-${slugify(fileName)}`
    const bucketName = BucketDestinations[PresignedUrlUploadType.nftThumbnail]

    const s3Params: S3.PresignedPost.Params = {
      Bucket: bucketName,
      Fields: { key },
      Conditions: [
        ['content-length-range', 0, maxBytes],
        ['starts-with', '$Content-Type', contentType]
      ],
      // ContentType: contentType
    }

    const presignedReq = await this.getPresignedPostRequest(s3Params)
    const presignedGetUrl = await this.getPresignedGetUrl(key, bucketName, 900)
    return {
      data: {
        ...presignedReq,
        presignedGetUrl
      }
    }
  }

  /**
   * Get presigned URL to get a file.
   * @param key key to the file
   * @param bucket bucket where the file exists
   * @param secondsToExpire time in seconds after which url expires, defaults to 1 hour
 */
  private getPresignedGetUrl(key: string, bucket: string, secondsToExpire = 3600): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: secondsToExpire
    })
  }

  /**
   * Get the form fields and target URL for direct POST uploading.
   * @param s3Params 
   * @returns 
   */
  private async getPresignedPostRequest(s3Params: S3.PresignedPost.Params)
    : Promise<PresignedUrlPostRequestDto> {
    return new Promise((resolve, reject) => {
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
