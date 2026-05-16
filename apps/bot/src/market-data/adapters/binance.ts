import type { Candle, Timeframe } from "@trade/shared";
import type { IExchangeAdapter, SymbolInfo } from "./exchange.interface.js";
import type { Logger } from "../../observability/logger.js";
import { binance as BinanceExchange } from "ccxt";

export class BinanceAdapter implements IExchangeAdapter {
  private readonly exchange: BinanceExchange;
  private readonly logger: Logger;

  constructor(apiKey: string | undefined, apiSecret: string | undefined, logger: Logger) {
    this.exchange = new BinanceExchange({
      ...(apiKey !== undefined && { apiKey }),
      ...(apiSecret !== undefined && { secret: apiSecret }),
      enableRateLimit: true,
      options: { defaultType: "spot" },
    });
    this.logger = logger;
  }

  async getOhlcv(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
    const raw = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit) as number[][];
    return raw.map((bar) => ({
      symbol,
      timeframe,
      openTime: bar[0] as number,
      closeTime: (bar[0] as number) + this.timeframeToMs(timeframe) - 1,
      open: bar[1] as number,
      high: bar[2] as number,
      low: bar[3] as number,
      close: bar[4] as number,
      volume: bar[5] as number,
    }));
  }

  async getLatestPrice(symbol: string): Promise<string> {
    const ticker = await this.exchange.fetchTicker(symbol);
    return String(ticker.last ?? ticker.close ?? 0);
  }

  subscribeToCandles(
    symbol: string,
    timeframe: Timeframe,
    onClose: (candle: Candle) => void
  ): () => void {
    // WS subscription via polling for now (ccxt pro needed for true WS)
    // In Phase 3 this will use ccxt.pro watchOHLCV
    let lastOpenTime = 0;
    const timer = setInterval(async () => {
      try {
        const candles = await this.getOhlcv(symbol, timeframe, 2);
        const latest = candles[candles.length - 2];
        if (latest && latest.openTime !== lastOpenTime) {
          lastOpenTime = latest.openTime;
          onClose(latest);
        }
      } catch (err) {
        this.logger.error({ err, symbol, timeframe }, "Candle subscription error");
      }
    }, 5_000);

    return () => clearInterval(timer);
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    const markets = await this.exchange.loadMarkets();
    const market = markets[symbol];
    if (!market) throw new Error(`Symbol ${symbol} not found on Binance`);
    return {
      symbol,
      baseAsset: market.base,
      quoteAsset: market.quote,
      minQty: String(market.limits?.amount?.min ?? "0"),
      pricePrecision: market.precision?.price ?? 8,
      qtyPrecision: market.precision?.amount ?? 8,
    };
  }

  async getServerTime(): Promise<number> {
    return Number(await this.exchange.fetchTime());
  }

  private timeframeToMs(tf: string): number {
    const map: Record<string, number> = {
      "1m": 60_000,
      "5m": 300_000,
      "15m": 900_000,
      "1h": 3_600_000,
      "4h": 14_400_000,
      "1d": 86_400_000,
    };
    return map[tf] ?? 900_000;
  }
}
