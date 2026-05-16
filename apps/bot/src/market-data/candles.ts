import type { Candle, Timeframe } from "@trade/shared";
import type { IExchangeAdapter } from "./adapters/exchange.interface.js";
import type { Logger } from "../observability/logger.js";

const WINDOW_SIZE = 300;

export class CandleService {
  private readonly windows = new Map<string, Candle[]>();
  private readonly exchange: IExchangeAdapter;
  private readonly logger: Logger;

  constructor(exchange: IExchangeAdapter, logger: Logger) {
    this.exchange = exchange;
    this.logger = logger;
  }

  async seed(symbol: string, timeframe: Timeframe): Promise<void> {
    const candles = await this.exchange.getOhlcv(symbol, timeframe, WINDOW_SIZE);
    this.windows.set(this.key(symbol, timeframe), candles);
    this.logger.info({ symbol, timeframe, count: candles.length }, "Candle window seeded");
  }

  append(symbol: string, timeframe: string, candle: Candle): void {
    const k = this.key(symbol, timeframe);
    const window = this.windows.get(k) ?? [];
    window.push(candle);
    if (window.length > WINDOW_SIZE) window.shift();
    this.windows.set(k, window);
  }

  getWindow(symbol: string, timeframe: string): Candle[] {
    return this.windows.get(this.key(symbol, timeframe)) ?? [];
  }

  private key(symbol: string, timeframe: string): string {
    return `${symbol}:${timeframe}`;
  }
}
