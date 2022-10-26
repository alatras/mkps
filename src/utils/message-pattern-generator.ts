export function MessagePatternGenerator(service: string, cmd: string) {
  return process.env.NODE_ENV + '.' + service + '.' + cmd
}
