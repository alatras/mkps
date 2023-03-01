import { getNftProperties } from './index'

export const getRequiredNftProperties = (): string[] => {
  return getNftProperties()
    .filter(prop => prop.required && prop.filterable)
    .map(prop => prop.key)
}
