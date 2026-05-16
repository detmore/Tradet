import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  _postgresClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb._postgresClient ??
  postgres(process.env["DATABASE_URL"] ?? "", { max: 10 });

if (process.env["NODE_ENV"] !== "production") {
  globalForDb._postgresClient = client;
}

export const db = drizzle(client);
