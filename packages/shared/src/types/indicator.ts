export interface PivotLevels {
  p: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
}

export interface AlligatorLines {
  jaw: number;
  teeth: number;
  lips: number;
}

export interface IndicatorSnapshot {
  ema200: number;
  ema50: number;
  ema20: number;
  rsi: number;
  atr: number;
  volume: number;
  volumeSma: number;
  mfi?: number;
  cmf?: number;
  alligator?: AlligatorLines;
  heikinAshiClose?: number;
  heikinAshiOpen?: number;
  isBullishFractalBreakout?: boolean;
  pivotLevels?: PivotLevels;
  ema2050CrossoverBarsAgo?: number;
  retestValid?: boolean;
  emaSpreadPct?: number;       // (ema20 - ema50) / ema50 * 100
  swingHigh?: number;          // max high of last 20 bars — breakout reference
  heikinAshiPrevClose?: number;
  heikinAshiPrevOpen?: number;
}
