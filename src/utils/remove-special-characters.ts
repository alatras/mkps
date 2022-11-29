/**
 * Remove special characters and slashes
 */
export const removeSpecialCharacters = (str: string): string => {
  return str.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
}
