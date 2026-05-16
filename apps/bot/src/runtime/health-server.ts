import { createServer } from "node:http";
import type { Logger } from "../observability/logger.js";

export class HealthServer {
  private server: ReturnType<typeof createServer> | null = null;

  constructor(private readonly logger: Logger) {}

  start(port = 9090): void {
    this.server = createServer((req, res) => {
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "bot", ts: Date.now() }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.listen(port, () => {
      this.logger.info({ port }, "Health server listening");
    });
  }

  stop(): void {
    this.server?.close();
  }
}
