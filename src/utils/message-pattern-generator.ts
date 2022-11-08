export function MessagePatternGenerator(service: string, cmd: string): string {
  const pattern =
    (process.env.NODE_ENV || 'development') + '.' + service + '.' + cmd
  return pattern
}
