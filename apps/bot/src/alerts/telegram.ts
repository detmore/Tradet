import type { Logger } from "../observability/logger.js";

export class TelegramClient {
  private readonly token: string;
  private readonly chatId: string;
  private readonly logger: Logger;

  constructor(token: string, chatId: string, logger: Logger) {
    this.token = token;
    this.chatId = chatId;
    this.logger = logger;
  }

  async send(text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: this.chatId, text, parse_mode: "Markdown" }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error({ status: res.status, body }, "Telegram send failed");
      throw new Error(`Telegram API error: ${res.status}`);
    }
  }
}
