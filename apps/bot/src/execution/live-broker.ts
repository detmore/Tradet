import type { ApprovedOrder, Fill } from "@trade/shared";

export class LiveBroker {
  placeMarketOrder(_order: ApprovedOrder): Promise<Fill> {
    // Live trading is not yet implemented. Activate via settings after paper trading validation.
    throw new Error(
      "Live trading is not yet implemented. Switch to paper mode in settings."
    );
  }
}
