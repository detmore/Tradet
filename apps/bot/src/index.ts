import postgres from "postgres";
import { env } from "@trade/config";
import { getDb, closeDb } from "@trade/db";
import { createLogger } from "./observability/logger.js";
import { DomainEventBus } from "./observability/events.js";
import { LifecycleService } from "./runtime/lifecycle.js";
import { PostgresNotifyPublisher } from "./runtime/notify.js";
import { HealthServer } from "./runtime/health-server.js";
import { DbInitService } from "./runtime/db-init.js";
import { StrategyConfigLoader } from "./runtime/strategy-config-loader.js";
import { EvaluationLoop } from "./runtime/evaluation-loop.js";
import { BinanceAdapter } from "./market-data/adapters/binance.js";
import { CandleService } from "./market-data/candles.js";
import { StrategyPipeline } from "./strategy/pipeline.js";
import { DecisionTraceWriter } from "./strategy/decision-trace.js";
import { DailyLimitsTracker } from "./risk/limits.js";
import { ConsecutiveLossTracker } from "./risk/cooldown.js";
import { KillSwitchService } from "./risk/kill-switch.js";
import { RiskApprover } from "./risk/approver.js";
import { PaperBroker } from "./execution/paper-broker.js";
import { LiveBroker } from "./execution/live-broker.js";
import { OrderManagementService } from "./execution/oms.js";
import { ExitManager } from "./execution/exits.js";
import { PositionService } from "./portfolio/positions.js";
import { EquityService } from "./portfolio/equity.js";
import { TelegramClient } from "./alerts/telegram.js";
import { AlertDispatcher } from "./alerts/dispatcher.js";
import type { Timeframe } from "@trade/shared";

const logger = createLogger("bot");
const db = getDb();
const events = new DomainEventBus();

async function main() {
  logger.info({ mode: env.BOT_MODE }, "Bot starting");

  // Services
  const notify = new PostgresNotifyPublisher(env.DATABASE_URL, createLogger("notify"));
  const lifecycle = new LifecycleService(db, createLogger("lifecycle"));
  const dbInit = new DbInitService(db, createLogger("db-init"));
  const configLoader = new StrategyConfigLoader(db, createLogger("config-loader"));

  const exchange = new BinanceAdapter(
    env.BINANCE_API_KEY,
    env.BINANCE_API_SECRET,
    createLogger("binance")
  );
  const candles = new CandleService(exchange, createLogger("candles"));
  const pipeline = new StrategyPipeline();
  const traceWriter = new DecisionTraceWriter(db, createLogger("trace"));
  const limits = new DailyLimitsTracker(createLogger("limits"));
  const cooldown = new ConsecutiveLossTracker(createLogger("cooldown"));
  const killSwitch = new KillSwitchService(db, createLogger("kill-switch"));
  const approver = new RiskApprover(limits, cooldown, killSwitch, createLogger("risk"));
  const paperBroker = new PaperBroker(createLogger("paper-broker"));
  const liveBroker = new LiveBroker();
  const exitManager = new ExitManager(createLogger("exits"));
  const positionService = new PositionService(db, createLogger("positions"));
  const equity = new EquityService(db, createLogger("equity"), env.BOT_MODE);

  const telegram =
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
      ? new TelegramClient(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, createLogger("telegram"))
      : null;
  const alertDispatcher = new AlertDispatcher(db, telegram, createLogger("alerts"));
  const oms = new OrderManagementService(
    db,
    paperBroker,
    liveBroker,
    events,
    createLogger("oms"),
    env.BOT_MODE,
    (symbol) => exchange.getLatestPrice(symbol)
  );

  // DB init: ensure required rows exist
  await dbInit.ensureBotSettings();
  await dbInit.ensureDefaultStrategyConfig();

  // Load strategy config
  const config = await configLoader.load();

  // Load kill switch state
  await killSwitch.load();

  // settings_events kanalını dinle — paper_reset gelince risk hafızasını anında temizle
  const listenerSql = postgres(env.DATABASE_URL, { max: 1 });
  void listenerSql.listen("settings_events", (payload) => {
    try {
      const event = JSON.parse(payload) as Record<string, unknown>;
      if (event["type"] === "paper_reset") {
        limits.reset();
        cooldown.reset();
        logger.info("Paper reset received via NOTIFY — risk state cleared");
      }
    } catch { /* invalid payload, ignore */ }
  });

  await lifecycle.start();
  const healthServer = new HealthServer(createLogger("health"));
  healthServer.start(9090);
  equity.start();

  // Seed candle windows for all symbols
  logger.info({ symbols: config.symbols, timeframe: config.timeframe }, "Seeding candle windows...");
  for (const symbol of config.symbols) {
    try {
      await candles.seed(symbol, config.timeframe as Timeframe);
    } catch (err) {
      logger.warn({ err, symbol }, "Failed to seed candles — will populate as ticks arrive");
    }
  }

  // Evaluation loop
  const evaluationLoop = new EvaluationLoop(
    {
      db,
      candles,
      pipeline,
      traceWriter,
      approver,
      oms,
      exitManager,
      positions: positionService,
      alertDispatcher,
      notify,
      events,
      logger: createLogger("eval-loop"),
    },
    env.BOT_MODE
  );

  // Subscribe to candle closes per symbol
  // Active subscriptions — rebuilt when timeframe or symbols change
  let activeUnsubs: Array<() => void> = [];
  let activeTimeframe = config.timeframe as Timeframe;
  let activeSymbols   = [...config.symbols] as string[];

  function buildSubscriptions(symbols: string[], timeframe: Timeframe): void {
    // Tear down existing subscriptions
    for (const unsub of activeUnsubs) unsub();
    activeUnsubs = [];
    activeTimeframe = timeframe;
    activeSymbols   = [...symbols];

    for (const symbol of symbols) {
      const unsub = exchange.subscribeToCandles(symbol, timeframe, (candle) => {
        const liveConfig = configLoader.getCached() ?? config;
        candles.append(symbol, liveConfig.timeframe, candle);
        void evaluationLoop.onTick(symbol, liveConfig.timeframe, liveConfig).catch((err: unknown) => {
          logger.error({ err, symbol }, "Evaluation loop error");
        });
      });
      activeUnsubs.push(unsub);
    }
    logger.info({ symbols, timeframe }, "Candle subscriptions (re)built");
  }

  buildSubscriptions(config.symbols as string[], config.timeframe as Timeframe);

  // Reload strategy config every 60s — rebuild subscriptions if timeframe or symbols changed
  const configReloadTimer = setInterval(() => {
    void configLoader.load()
      .then(newConfig => {
        const tfChanged  = newConfig.timeframe !== activeTimeframe;
        const symChanged = JSON.stringify([...newConfig.symbols].sort()) !== JSON.stringify([...activeSymbols].sort());
        if (tfChanged || symChanged) {
          logger.info(
            { old: { timeframe: activeTimeframe, symbols: activeSymbols }, new: { timeframe: newConfig.timeframe, symbols: newConfig.symbols } },
            "Config changed — rebuilding subscriptions"
          );
          void (async () => {
            for (const symbol of newConfig.symbols as string[]) {
              await candles.seed(symbol, newConfig.timeframe as Timeframe).catch(() => {});
            }
            buildSubscriptions(newConfig.symbols as string[], newConfig.timeframe as Timeframe);
          })();
        }
      })
      .catch((err: unknown) => { logger.error({ err }, "Config reload failed"); });
  }, 60_000);

  logger.info({ symbols: config.symbols, timeframe: config.timeframe, mode: env.BOT_MODE }, "Bot running");

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    healthServer.stop();
    clearInterval(configReloadTimer);
    for (const unsub of activeUnsubs) unsub();
    equity.stop();
    await lifecycle.stop();
    await notify.close();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  logger.error(err, "Fatal error during bot startup");
  process.exit(1);
});
