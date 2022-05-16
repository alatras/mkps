import { SetMetadata } from '@nestjs/common'

export const JWT_OPTIONAL_META_KEY = 'jwtOptional'

export const JwtOptional = () => SetMetadata(JWT_OPTIONAL_META_KEY, true)
