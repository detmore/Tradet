import { getDb, closeDb } from "@trade/db";
import { DbInitService } from "../src/runtime/db-init.js";
import { createLogger } from "../src/observability/logger.js";

const db = getDb();
const logger = createLogger("seed");
const dbInit = new DbInitService(db, logger);

await dbInit.ensureBotSettings();
await dbInit.ensureDefaultStrategyConfig();
logger.info("Seed complete");
await closeDb();
