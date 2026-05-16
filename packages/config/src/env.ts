import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BOT_MODE: z.enum(["paper", "live"]).default("paper"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => `  ${(i.path as PropertyKey[]).join(".")}: ${String(i.message)}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
