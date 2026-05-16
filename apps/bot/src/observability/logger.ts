import pino from "pino";
import { env } from "@trade/config";

export function createLogger(name: string) {
  const opts: Parameters<typeof pino>[0] = { name, level: env.LOG_LEVEL };
  if (env.NODE_ENV === "development") {
    opts.transport = { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } };
  }
  return pino(opts);
}

export type Logger = ReturnType<typeof createLogger>;
