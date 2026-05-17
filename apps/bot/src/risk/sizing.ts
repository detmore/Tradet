const TAKER_FEE = 0.001; // %0.1 Binance spot taker fee

export function computePositionSize(
  balance: number,
  riskPercent: number,
  entryPrice: number,
  sl: number,
  _maxOpenExposure: number,  // toplam pozisyon limiti approver'da ayrıca kontrol edilir
  positionCapEnabled = false,
  maxPositionPct = 0.05
): number {
  const riskAmount = balance * riskPercent;
  const slDistance = Math.abs(entryPrice - sl);
  if (slDistance === 0 || entryPrice === 0) return 0;

  const riskBasedQty = riskAmount / slDistance;

  // Hard balance cap (fee + float margin)
  const balanceCap = (balance * 0.9995) / (entryPrice * (1 + TAKER_FEE));

  // Optional per-position cap: max X% of balance as notional value
  const positionCap = positionCapEnabled && maxPositionPct > 0
    ? (balance * maxPositionPct) / (entryPrice * (1 + TAKER_FEE))
    : Infinity;

  return Math.min(riskBasedQty, balanceCap, positionCap);
}
