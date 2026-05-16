export function computeVolumeSma(volumes: number[], period: number): number[] {
  if (volumes.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < volumes.length; i++) {
    const sum = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function latestVolumeSma(volumes: number[], period: number): number {
  const series = computeVolumeSma(volumes, period);
  return series[series.length - 1] ?? 0;
}
