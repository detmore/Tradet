import type { Candle, Timeframe } from "@trade/shared";

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  minQty: string;
  pricePrecision: number;
  qtyPrecision: number;
}

export interface IExchangeAdapter {
  getOhlcv(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]>;
  getLatestPrice(symbol: string): Promise<string>;
  getAccountBalance(asset: string): Promise<string>;
  subscribeToCandles(
    symbol: string,
    timeframe: Timeframe,
    onClose: (candle: Candle) => void
  ): () => void;
  getSymbolInfo(symbol: string): Promise<SymbolInfo>;
  getServerTime(): Promise<number>;
}
