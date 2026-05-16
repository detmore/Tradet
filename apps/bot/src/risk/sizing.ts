const TAKER_FEE = 0.001; // %0.1 Binance spot taker fee

export function computePositionSize(
  balance: number,
  riskPercent: number,
  entryPrice: number,
  sl: number,
  _maxOpenExposure: number  // toplam pozisyon limiti için approver'da ayrıca kontrol edilir
): number {
  const riskAmount = balance * riskPercent;
  const slDistance = Math.abs(entryPrice - sl);
  if (slDistance === 0 || entryPrice === 0) return 0;

  const riskBasedQty = riskAmount / slDistance;

  // balanceCap: fee dahil fill cost bakiyeyi geçmesin
  // qty * price * (1 + fee) <= balance  →  qty <= balance / (price * (1 + fee))
  const balanceCap = balance / (entryPrice * (1 + TAKER_FEE));

  return Math.min(riskBasedQty, balanceCap);
}
