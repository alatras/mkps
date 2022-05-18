import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { from } from 'uuid-mongodb'

@Injectable()
export class ValidateMongoUuid implements PipeTransform<string> {
  transform(value: string): string {
    try {
      if (from(value).toString() === value) {
        return value
      }
    } catch (e) {
      throw new BadRequestException()
    }
  }
}
