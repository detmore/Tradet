import type { LayerName, DecisionAction } from "../enums";

export interface LayerResult {
  layer: LayerName;
  passed: boolean;
  value: number | boolean | string;
  threshold: number | boolean | string;
  contribution: number;
  reason?: string;
}

export interface Decision {
  action: DecisionAction;
  score: number;
  trace: LayerResult[];
  mandatoryPassed: boolean;
  setupPassed: boolean;
  confirmationsPassed: boolean;
  structurePassed: boolean;
}

export interface StrategyThresholds {
  scoreThreshold: number;
  rsiMin: number;
  rsiMax: number;
  mfiMin: number;
  cmfMin: number;
  volSmaMultiplier: number;
  atrMin: number;
  atrMax: number;
  emaCrossoverBars: number;
  emaSpreadMin: number; // min % spread between ema20 and ema50
}

export interface StrategyFlags {
  useMfi: boolean;
  useCmf: boolean;
  usePivot: boolean;
  useFractal: boolean;
  useAlligator: boolean;
  useHeikinAshi: boolean;
  breakoutCloseConfirm: boolean;
  retestConfirm: boolean;
}

export interface RiskConfig {
  riskPerTrade: number;
  maxDailyLoss: number;
  maxOpenExposure: number;
  consecutiveLossPause: number;
  cooldownDurationHours: number;
  positionCapEnabled: boolean;
  maxPositionPct: number; // max % of balance per single position (e.g. 0.05 = 5%)
}

export interface ExitConfig {
  slAtrMult: number;
  tpAtrMult: number;
  trailingEnabled: boolean;
  maxBarsInPosition: number; // 0 = disabled
}

export interface StrategyConfig {
  id: string;
  name: string;
  version: number;
  timeframe: string;
  symbols: string[];
  enabled: boolean;
  thresholds: StrategyThresholds;
  flags: StrategyFlags;
  risk: RiskConfig;
  exits: ExitConfig;
}
