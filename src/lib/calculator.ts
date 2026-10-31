export interface EarningsSettings {
  rate?: number;
  overtime?: number;
  normal?: number;
}

export function calcEarnings(hours: number, settings: EarningsSettings): number {
  const rate = settings.rate || 0;
  const overtime = settings.overtime || 0;
  const normal = settings.normal || 0;
  if (hours <= normal) return hours * rate;
  return normal * rate + (hours - normal) * rate * overtime;
}
