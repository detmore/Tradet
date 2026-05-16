export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "pending" | "open" | "filled" | "cancelled" | "rejected";
export type PositionStatus = "open" | "closed";
export type BotMode = "paper" | "live";
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type ExitReason = "sl" | "tp" | "trailing" | "invalidation" | "manual";
export type DecisionAction = "buy" | "sell" | "close" | "no_trade";
export type AlertSeverity = "info" | "warning" | "error" | "critical";
export type AlertCategory =
  | "trade_opened"
  | "trade_closed"
  | "sl_hit"
  | "tp_hit"
  | "daily_loss_limit"
  | "kill_switch"
  | "bot_error"
  | "connection_error";
export type RiskRejectionCategory =
  | "daily_loss_limit"
  | "exposure_limit"
  | "cooldown"
  | "kill_switch"
  | "min_qty"
  | "no_signal";
export type LayerName =
  | "ema200_filter"
  | "atr_range_filter"
  | "volume_filter"
  | "ema2050_setup"
  | "rsi_confirmation"
  | "mfi_confirmation"
  | "cmf_confirmation"
  | "breakout_confirmation"
  | "fractal_structure"
  | "alligator_structure"
  | "heikin_ashi_structure";
