export function MessagePatternGenerator(service: string, cmd: string): string {
  return (process.env.NODE_ENV || 'development') + '.' + service + '.' + cmd
}
