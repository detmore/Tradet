export interface SlippageConfig {
  fixedBps: number;
  variableBps: number;
}

export function estimateSlippage(
  side: "buy" | "sell",
  price: number,
  config: SlippageConfig
): number {
  const totalBps = config.fixedBps + config.variableBps;
  const slippage = price * (totalBps / 10_000);
  return side === "buy" ? price + slippage : price - slippage;
}
