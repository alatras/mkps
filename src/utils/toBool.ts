export const toBool = (value: unknown): boolean => {
  return value === 1 || value === '1' || value === true || value === 'true'
}
