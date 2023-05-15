import { toBool } from './toBool'

export const isKycEnabled = (): boolean => {
  return toBool(process.env.IS_KYC_ENABLED)
}
