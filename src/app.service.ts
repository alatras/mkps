import { Injectable } from '@nestjs/common'
import { version as packageJsonVersion } from '../package.json'

@Injectable()
export class AppService {
  getVersion(): string {
    return process.env.npm_package_version ?? packageJsonVersion
  }
}
