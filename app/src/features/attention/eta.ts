// New ETA = current plan + reported delay; acknowledging applies it once.
export function shiftedEta(current: string, minutes: number) {
  return new Date(Date.parse(current) + minutes * 60000).toISOString();
}
