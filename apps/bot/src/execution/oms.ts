import type { ApprovedOrder, Order, Fill, BotMode } from "@trade/shared";
import type { Db } from "@trade/db";
import type { PaperBroker } from "./paper-broker.js";
import type { LiveBroker } from "./live-broker.js";
import type { DomainEventBus } from "../observability/events.js";
import type { Logger } from "../observability/logger.js";
import { randomUUID } from "node:crypto";

export class OrderManagementService {
  constructor(
    private readonly db: Db,
    private readonly paperBroker: PaperBroker,
    private readonly liveBroker: LiveBroker,
    private readonly events: DomainEventBus,
    private readonly logger: Logger,
    private readonly mode: BotMode,
    private readonly currentPriceFn: (symbol: string) => Promise<string>
  ) {}

  async placeOrder(approved: ApprovedOrder): Promise<{ order: Order; fill: Fill }> {
    const { orders, fills } = await import("@trade/db");

    const clientOrderId = randomUUID();
    const currentPrice = await this.currentPriceFn(approved.symbol);

    let fill: Fill;
    if (this.mode === "paper") {
      fill = this.paperBroker.fill(approved, currentPrice);
    } else {
      fill = await this.liveBroker.placeMarketOrder(approved);
    }

    const [orderRow] = await this.db
      .insert(orders)
      .values({
        clientOrderId,
        symbol: approved.symbol,
        side: approved.side,
        type: "market",
        qty: approved.qty,
        status: "filled",
        mode: this.mode,
        strategyRunId: approved.strategyRunId,
      })
      .returning();

    if (!orderRow) throw new Error("Failed to insert order");

    await this.db.insert(fills).values({
      orderId: orderRow.id,
      qty: fill.qty,
      price: fill.price,
      fee: fill.fee,
      feeAsset: fill.feeAsset,
    });

    this.events.emit("order_placed", {
      orderId: orderRow.id,
      symbol: approved.symbol,
      side: approved.side,
      qty: approved.qty,
    });

    const order: Order = {
      id: orderRow.id,
      clientOrderId,
      symbol: approved.symbol,
      side: approved.side,
      type: "market",
      qty: approved.qty,
      status: "filled",
      mode: this.mode,
      strategyRunId: approved.strategyRunId,
      createdAt: orderRow.createdAt,
      updatedAt: orderRow.updatedAt,
    };

    // Ensure the in-memory fill has the correct orderId (broker generates a placeholder)
    const fillWithCorrectOrderId: Fill = { ...fill, orderId: orderRow.id };

    return { order, fill: fillWithCorrectOrderId };
  }
}
