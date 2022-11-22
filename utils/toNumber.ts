export const toNumber = (value: string, defaultValue: number = 0): number => {
  let newValue: number = Number.parseInt(value || String(defaultValue), 10)
  return Number.isNaN(newValue) ? defaultValue : newValue
}
