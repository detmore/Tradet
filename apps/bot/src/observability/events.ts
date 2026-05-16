import { EventEmitter } from "node:events";
import type { Trade, Position, Alert } from "@trade/shared";

export interface DomainEvents {
  order_placed: { orderId: string; symbol: string; side: string; qty: string };
  position_opened: { position: Position };
  position_closed: { position: Position; trade: Trade };
  sl_triggered: { positionId: string; symbol: string; price: string };
  tp_triggered: { positionId: string; symbol: string; price: string };
  risk_rejected: { symbol: string; reason: string; category: string };
  alert_created: { alert: Alert };
  equity_updated: { totalBalance: string; unrealizedPnl: string };
  bot_settings_changed: { field: string; value: unknown };
}

type EventListener<T> = (payload: T) => void;

export class DomainEventBus {
  private readonly emitter = new EventEmitter();

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof DomainEvents>(event: K, listener: EventListener<DomainEvents[K]>): () => void {
    this.emitter.on(event, listener as EventListener<unknown>);
    return () => this.emitter.off(event, listener as EventListener<unknown>);
  }

  once<K extends keyof DomainEvents>(event: K, listener: EventListener<DomainEvents[K]>): void {
    this.emitter.once(event, listener as EventListener<unknown>);
  }
}
