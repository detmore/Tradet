import { BinanceAdapter } from "../src/market-data/adapters/binance.js";
import { BacktestEngine } from "../src/backtest/engine.js";
import { printResults } from "../src/backtest/reporter.js";
import { createLogger } from "../src/observability/logger.js";
import {
  RISK_DEFAULTS,
  EXIT_DEFAULTS,
  THRESHOLD_DEFAULTS,
  FLAG_DEFAULTS,
} from "@trade/config";
import type { StrategyConfig, Timeframe } from "@trade/shared";

const SYMBOL = process.argv[2] ?? "BTC/USDT";
const TIMEFRAME = (process.argv[3] ?? "15m") as Timeframe;
const CANDLE_LIMIT = parseInt(process.argv[4] ?? "500", 10);
const INITIAL_BALANCE = parseFloat(process.argv[5] ?? "10000");

const logger = createLogger("backtest");

const strategyConfig: StrategyConfig = {
  id: "backtest",
  name: "Backtest Default",
  version: 1,
  timeframe: TIMEFRAME,
  symbols: [SYMBOL],
  enabled: true,
  thresholds: THRESHOLD_DEFAULTS,
  flags: FLAG_DEFAULTS,
  risk: RISK_DEFAULTS,
  exits: EXIT_DEFAULTS,
};

logger.info(
  { symbol: SYMBOL, timeframe: TIMEFRAME, candles: CANDLE_LIMIT },
  "Starting backtest"
);

const exchange = new BinanceAdapter(undefined, undefined, logger);
const candles = await exchange.getOhlcv(SYMBOL, TIMEFRAME, CANDLE_LIMIT);

logger.info({ fetched: candles.length }, "Candles fetched");

const engine = new BacktestEngine();
const results = engine.run({
  strategyConfig,
  candles,
  symbol: SYMBOL,
  initialBalance: INITIAL_BALANCE,
});

printResults(results);
