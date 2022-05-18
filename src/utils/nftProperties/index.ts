import * as NftProperties from './tenant.json'
import * as NftPropertiesCommon from './common.json'

// TODO: Refactor and move to relevant folder

export interface NftProperty {
  key: string
  type: NftPropertyTypes
  if?: {
    key: string
    value: any
  }
  label?: string
  hintText?: string
  filterable?: boolean
  placeholder?: string
  required?: boolean
  isDisabled?: boolean
  options?: {
    key: string
    label: string
    value: any
  }[]
  content?: NftProperty[]
}

export enum NftPropertyTypes {
  singleLineText = 'singleLineText',
  multiLineText = 'multiLineText',
  markdownText = 'markdownText',
  radioButton = 'radioButton',
  number = 'number',
  select = 'select',
  switch = 'switch',
  box = 'box',
  datePicker = 'datePicker',
  dateTimePicker = 'dateTimePicker'
}

// replace me once implemented
const i18next = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  t: (s: string, o: any) => s
}

const mapProperties = (
  nftProperties: NftProperty[],
  lng: string
): NftProperty[] => {
  return nftProperties.map(prop => {
    return {
      ...prop,
      placeholder: i18next.t(prop.placeholder || '', {
        lng,
        ns: 'nftProperties'
      }),
      label: prop.label
        ? i18next.t(prop.label, { lng, ns: 'nftProperties' })
        : undefined,
      hintText: prop.hintText
        ? i18next.t(prop.hintText, { lng, ns: 'nftProperties' })
        : undefined,
      content: prop.content ? mapProperties(prop.content, lng) : undefined
    }
  })
}

export const getNftProperties = (lng = 'en'): NftProperty[] => {
  const nftProperties: NftProperty[] = NftProperties.properties as NftProperty[]
  const nftPropertiesCommon: NftProperty[] =
    NftPropertiesCommon.properties as NftProperty[]

  return [
    ...mapProperties(nftProperties, lng),
    ...mapProperties(nftPropertiesCommon, lng)
  ]
}
