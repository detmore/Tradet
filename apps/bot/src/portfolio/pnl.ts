export function computeRealizedPnl(
  entryPrice: number,
  exitPrice: number,
  qty: number,
  fees: number
): number {
  return (exitPrice - entryPrice) * qty - fees;
}

export function computeUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  qty: number
): number {
  return (currentPrice - entryPrice) * qty;
}
