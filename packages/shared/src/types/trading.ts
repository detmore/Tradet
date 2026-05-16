import type { OrderSide, OrderStatus, OrderType, PositionStatus, BotMode, ExitReason } from "../enums";

export interface ApprovedOrder {
  symbol: string;
  side: OrderSide;
  qty: string;
  price?: string;
  sl: string;
  tp: string;
  strategyRunId: string;
  strategyConfigId: string;
}

export interface RiskRejection {
  category: string;
  reason: string;
}

export interface Order {
  id: string;
  clientOrderId: string;
  exchangeOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: string;
  price?: string;
  status: OrderStatus;
  mode: BotMode;
  strategyRunId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Fill {
  id: string;
  orderId: string;
  qty: string;
  price: string;
  fee: string;
  feeAsset: string;
  timestamp: Date;
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: string;
  avgEntry: string;
  status: PositionStatus;
  mode: BotMode;
  openedAt: Date;
  closedAt?: Date;
  sl?: string;
  tp?: string;
  trailingSl?: string;
  strategyRunId?: string;
}

export interface Trade {
  id: string;
  positionId: string;
  symbol: string;
  side: OrderSide;
  entryPrice: string;
  exitPrice: string;
  qty: string;
  realizedPnl: string;
  fees: string;
  openedAt: Date;
  closedAt: Date;
  durationMs: number;
  decisionScore?: string;
  mode: BotMode;
  exitReason: ExitReason;
}

export interface EquitySnapshot {
  id: string;
  takenAt: Date;
  mode: BotMode;
  totalBalance: string;
  availableBalance: string;
  unrealizedPnl: string;
  realizedPnlCum: string;
  openPositionsCount: number;
}

export interface BotSettings {
  id: number;
  mode: BotMode;
  paperStartingBalance: string;
  paperCurrentBalance: string;
  accountCurrency: string;
  isRunning: boolean;
  killSwitchActive: boolean;
  updatedAt: Date;
}
