import type { Logger } from "../observability/logger.js";

export type TickCallback = (symbol: string, timeframe: string) => Promise<void>;

const TIMEFRAME_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

export class Scheduler {
  private timers: NodeJS.Timeout[] = [];
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  schedule(symbols: string[], timeframe: string, onTick: TickCallback): void {
    const intervalMs = TIMEFRAME_MS[timeframe];
    if (intervalMs === undefined) {
      throw new Error(`Unsupported timeframe: ${timeframe}`);
    }

    for (const symbol of symbols) {
      const timer = setInterval(async () => {
        try {
          await onTick(symbol, timeframe);
        } catch (err) {
          this.logger.error({ err, symbol, timeframe }, "Tick handler error");
        }
      }, intervalMs);

      this.timers.push(timer);
      this.logger.info({ symbol, timeframe, intervalMs }, "Scheduled tick");
    }
  }

  stop(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    this.logger.info("Scheduler stopped");
  }
}
