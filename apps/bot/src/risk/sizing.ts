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
  // Tek güvence: bakiyenden fazla BTC alamazsın (spot için zorunlu)
  const balanceCap   = balance / entryPrice;

  return Math.min(riskBasedQty, balanceCap);
}
