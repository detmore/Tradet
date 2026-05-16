const FEE_RATE = 0.001;

export function computeRealizedPnl(
  entryPrice: number,
  exitPrice: number,
  qty: number,
  exitFees: number
): number {
  const entryFee = entryPrice * qty * FEE_RATE;
  return (exitPrice - entryPrice) * qty - exitFees - entryFee;
}

export function computeUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  qty: number
): number {
  return (currentPrice - entryPrice) * qty;
}
