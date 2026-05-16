import type { ApprovedOrder, Fill } from "@trade/shared";
import type { Logger } from "../observability/logger.js";
import { randomUUID } from "node:crypto";
import { estimateSlippage } from "./slippage.js";

const PAPER_FEE_RATE = 0.001;

// Conservative default slippage: 2bps fixed + 1bps variable
const DEFAULT_SLIPPAGE = { fixedBps: 2, variableBps: 1 };

export class PaperBroker {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  fill(order: ApprovedOrder, currentPrice: string): Fill {
    const rawPrice = parseFloat(currentPrice);
    // Apply slippage model so paper fills reflect realistic execution
    const fillPrice = estimateSlippage(order.side, rawPrice, DEFAULT_SLIPPAGE);
    const qty = parseFloat(order.qty);
    const fee = fillPrice * qty * PAPER_FEE_RATE;
    const fillPriceStr = fillPrice.toFixed(8);

    this.logger.info(
      { symbol: order.symbol, rawPrice, fillPrice, qty, fee, slippage: fillPrice - rawPrice },
      "Paper fill simulated"
    );

    return {
      id: randomUUID(),
      orderId: randomUUID(),
      qty: order.qty,
      price: fillPriceStr,
      fee: fee.toFixed(8),
      feeAsset: "USDT",
      timestamp: new Date(),
    };
  }
}
