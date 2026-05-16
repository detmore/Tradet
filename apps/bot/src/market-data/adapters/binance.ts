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

  async getAccountBalance(asset: string = "USDT"): Promise<string> {
    const balance = await this.exchange.fetchBalance();
    const total = ((balance.total as unknown) as Record<string, number | undefined>)[asset] ?? 0;
    return String(total);
  }

  subscribeToCandles(
    symbol: string,
    timeframe: Timeframe,
    onClose: (candle: Candle) => void
  ): () => void {
    // Polling-based subscription (ccxt pro needed for true WebSocket)
    // null = first poll; set baseline without triggering onClose to prevent spurious ticks
    // on subscription rebuild (e.g. after timeframe/symbol config change)
    let lastOpenTime: number | null = null;
    let consecutiveErrors = 0;
    const timer = setInterval(async () => {
      try {
        const candles = await this.getOhlcv(symbol, timeframe, 2);
        consecutiveErrors = 0; // başarılı istek — sayacı sıfırla
        const latest = candles[candles.length - 2];
        if (!latest) return;
        if (lastOpenTime === null) {
          lastOpenTime = latest.openTime; // baseline — no callback
          return;
        }
        if (latest.openTime !== lastOpenTime) {
          lastOpenTime = latest.openTime;
          onClose(latest);
        }
      } catch (err) {
        consecutiveErrors++;
        // İlk 3 hata debug, sonrasında warn (flood önleme)
        if (consecutiveErrors <= 3) {
          this.logger.warn({ err, symbol, timeframe, consecutiveErrors }, "Candle fetch failed — retrying");
        } else if (consecutiveErrors % 12 === 0) {
          // Her 1 dakikada bir (12 × 5s) uyar
          this.logger.error({ symbol, timeframe, consecutiveErrors }, `Candle feed down for ~${Math.round(consecutiveErrors * 5 / 60)} min`);
        }
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
