CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text DEFAULT 'internal' NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equity_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" text DEFAULT 'paper' NOT NULL,
	"total_balance" numeric(20, 8) NOT NULL,
	"available_balance" numeric(20, 8) NOT NULL,
	"unrealized_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"realized_pnl_cum" numeric(20, 8) DEFAULT '0' NOT NULL,
	"open_positions_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"qty" numeric(20, 8) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"fee" numeric(20, 8) DEFAULT '0' NOT NULL,
	"fee_asset" text DEFAULT 'USDT' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"mode" text DEFAULT 'paper' NOT NULL,
	"paper_starting_balance" numeric(20, 8) DEFAULT '10000' NOT NULL,
	"paper_current_balance" numeric(20, 8) DEFAULT '10000' NOT NULL,
	"live_current_balance" numeric(20, 8),
	"account_currency" text DEFAULT 'USDT' NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"kill_switch_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"timeframe" text DEFAULT '15m' NOT NULL,
	"symbols" jsonb DEFAULT '[]' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"thresholds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"exits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "symbols" (
	"symbol" text PRIMARY KEY NOT NULL,
	"exchange" text NOT NULL,
	"base_asset" text NOT NULL,
	"quote_asset" text NOT NULL,
	"min_qty" numeric(20, 8) DEFAULT '0' NOT NULL,
	"price_precision" integer DEFAULT 8 NOT NULL,
	"qty_precision" integer DEFAULT 8 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_config_id" uuid,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text NOT NULL,
	"score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"trace" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mandatory_passed" boolean DEFAULT false NOT NULL,
	"setup_passed" boolean DEFAULT false NOT NULL,
	"confirmations_passed" boolean DEFAULT false NOT NULL,
	"structure_passed" boolean DEFAULT false NOT NULL,
	"risk_approved" boolean,
	"risk_rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_order_id" text NOT NULL,
	"exchange_order_id" text,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"type" text DEFAULT 'market' NOT NULL,
	"qty" numeric(20, 8) NOT NULL,
	"price" numeric(20, 8),
	"status" text DEFAULT 'pending' NOT NULL,
	"mode" text DEFAULT 'paper' NOT NULL,
	"strategy_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_client_order_id_unique" UNIQUE("client_order_id")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"qty" numeric(20, 8) NOT NULL,
	"avg_entry" numeric(20, 8) NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"mode" text DEFAULT 'paper' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"sl" numeric(20, 8),
	"tp" numeric(20, 8),
	"trailing_sl" numeric(20, 8),
	"strategy_run_id" uuid
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"exit_price" numeric(20, 8) NOT NULL,
	"qty" numeric(20, 8) NOT NULL,
	"realized_pnl" numeric(20, 8) NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0' NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"duration_ms" bigint DEFAULT 0 NOT NULL,
	"decision_score" numeric(5, 2),
	"mode" text DEFAULT 'paper' NOT NULL,
	"exit_reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_alerts_sent_at" ON "alerts" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_alerts_category" ON "alerts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_equity_snapshots_mode_taken_at" ON "equity_snapshots" USING btree ("mode","taken_at");--> statement-breakpoint
CREATE INDEX "idx_strategy_runs_symbol_evaluated_at" ON "strategy_runs" USING btree ("symbol","evaluated_at");--> statement-breakpoint
CREATE INDEX "idx_positions_status_mode" ON "positions" USING btree ("status","mode");--> statement-breakpoint
CREATE INDEX "idx_positions_symbol_status_mode" ON "positions" USING btree ("symbol","status","mode");--> statement-breakpoint
CREATE INDEX "idx_trades_mode_closed_at" ON "trades" USING btree ("mode","closed_at");--> statement-breakpoint
CREATE INDEX "idx_trades_symbol_mode" ON "trades" USING btree ("symbol","mode");