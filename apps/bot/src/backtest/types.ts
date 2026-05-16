import type { Candle, StrategyConfig, LayerResult } from "@trade/shared";

export interface BacktestConfig {
  strategyConfig: StrategyConfig;
  candles: Candle[];
  symbol: string;
  initialBalance: number;
}

export interface BacktestTrade {
  openedAt: Date;
  closedAt: Date;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  sl: number;
  tp: number;
  exitReason: "sl" | "tp" | "trailing" | "max_bars";
  pnl: number;
  pnlPercent: number;
  score: number;
  trace: LayerResult[];
}

export interface BacktestResults {
  symbol: string;
  timeframe: string;
  candlesAnalyzed: number;
  tradesTotal: number;
  tradesWon: number;
  tradesLost: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  expectancy: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: Array<{ index: number; equity: number }>;
}
