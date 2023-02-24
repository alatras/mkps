/**
 * Validates that required properties are present in NFT draft.
 */
import { NftDraftModel } from '../../nft/schemas/nft-draft-model'
import { getNftProperties } from './index'

export const validateDynamicNftProperties = (
  properties: NftDraftModel['properties']
): boolean => {
  const requiredProperties = getNftProperties()
    .filter(prop => prop.required && prop.filterable)
    .map(prop => prop.key)

  const missingProperties = requiredProperties.filter(
    prop => !Object.keys(properties).includes(prop)
  )

  return missingProperties.length === 0
}
