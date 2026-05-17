export const RISK_DEFAULTS = {
  riskPerTrade: 0.005,
  maxDailyLoss: 0.02,
  maxOpenExposure: 0.03,
  consecutiveLossPause: 3,
  cooldownDurationHours: 4,
  positionCapEnabled: false,
  maxPositionPct: 0.05,
};

export const EXIT_DEFAULTS = {
  slAtrMult: 1.5,
  tpAtrMult: 2.5,
  trailingEnabled: false,
};

export const THRESHOLD_DEFAULTS = {
  scoreThreshold: 60,
  rsiMin: 55,
  rsiMax: 70,
  mfiMin: 50,
  cmfMin: 0,
  volSmaMultiplier: 1.0,
  atrMin: 0,
  atrMax: Infinity,
  emaCrossoverBars: 5,
};

export const FLAG_DEFAULTS = {
  useMfi: true,
  useCmf: true,
  usePivot: true,
  useFractal: true,
  useAlligator: true,
  useHeikinAshi: true,
  breakoutCloseConfirm: true,
  retestConfirm: false,
};

export const INDICATOR_PERIODS = {
  ema200: 200,
  ema50: 50,
  ema20: 20,
  rsi: 14,
  atr: 14,
  volumeSma: 20,
  mfi: 14,
  cmf: 20,
  alligatorJaw: 13,
  alligatorTeeth: 8,
  alligatorLips: 5,
  fractal: 2,
} as const;

export const LAYER_SCORES = {
  rsi: 20,
  mfi: 15,
  cmf: 15,
  breakout: 20,
  fractal: 10,
  alligator: 10,
  heikinAshi: 10,
} as const;
