export function getDateEmailFormat(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0') // Month is 0-based
  const day = String(date.getUTCDate()).padStart(2, '0')

  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hour}:${minute} UTC`
}
