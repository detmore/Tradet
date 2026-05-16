import type { Candle, IndicatorSnapshot, StrategyFlags } from "@trade/shared";
import { INDICATOR_PERIODS } from "@trade/config";
import { latestEma, computeEma } from "./ema.js";
import { latestRsi } from "./rsi.js";
import { latestAtr } from "./atr.js";
import { latestVolumeSma } from "./volume.js";
import { latestMfi } from "./mfi.js";
import { latestCmf } from "./cmf.js";
import { latestAlligator } from "./alligator.js";
import { computeHeikinAshi } from "./heikinAshi.js";
import { detectFractals } from "./fractal.js";
import { computePivotLevels } from "./pivot.js";

export function computeAllIndicators(candles: Candle[], flags: StrategyFlags): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const ema200 = latestEma(closes, INDICATOR_PERIODS.ema200);
  const ema50 = latestEma(closes, INDICATOR_PERIODS.ema50);
  const ema20 = latestEma(closes, INDICATOR_PERIODS.ema20);
  const rsi = latestRsi(closes, INDICATOR_PERIODS.rsi);
  const atr = latestAtr(candles, INDICATOR_PERIODS.atr);
  const volume = closes.length > 0 ? (candles[candles.length - 1]?.volume ?? 0) : 0;
  const volumeSma = latestVolumeSma(volumes, INDICATOR_PERIODS.volumeSma);

  const ema20Series = computeEma(closes, INDICATOR_PERIODS.ema20);
  const ema50Series = computeEma(closes, INDICATOR_PERIODS.ema50);
  let ema2050CrossoverBarsAgo: number | undefined;
  const minLen = Math.min(ema20Series.length, ema50Series.length);
  for (let i = minLen - 1; i >= 1; i--) {
    const cur20 = ema20Series[i] ?? 0;
    const prev20 = ema20Series[i - 1] ?? 0;
    const cur50 = ema50Series[i] ?? 0;
    const prev50 = ema50Series[i - 1] ?? 0;
    if (prev20 <= prev50 && cur20 > cur50) {
      ema2050CrossoverBarsAgo = minLen - 1 - i;
      break;
    }
  }

  const snapshot: IndicatorSnapshot = {
    ema200,
    ema50,
    ema20,
    rsi,
    atr,
    volume,
    volumeSma,
    ...(ema2050CrossoverBarsAgo !== undefined && { ema2050CrossoverBarsAgo }),
  };

  if (flags.useMfi) snapshot.mfi = latestMfi(candles, INDICATOR_PERIODS.mfi);
  if (flags.useCmf) snapshot.cmf = latestCmf(candles, INDICATOR_PERIODS.cmf);
  if (flags.useAlligator) snapshot.alligator = latestAlligator(candles);
  if (flags.useHeikinAshi) {
    const haCandles = computeHeikinAshi(candles);
    const latest = haCandles[haCandles.length - 1];
    if (latest) {
      snapshot.heikinAshiClose = latest.close;
      snapshot.heikinAshiOpen = latest.open;
    }
  }

  if (flags.useFractal) {
    const { bullFractals } = detectFractals(candles);
    const lastBull = bullFractals[bullFractals.length - 1];
    const currentClose = candles[candles.length - 1]?.close ?? 0;
    if (lastBull !== undefined) {
      const fractalLow = candles[lastBull]?.low ?? 0;
      snapshot.isBullishFractalBreakout = currentClose > fractalLow;
    }
  }

  if (flags.usePivot) {
    const prevCandle = candles[candles.length - 2];
    if (prevCandle) {
      snapshot.pivotLevels = computePivotLevels(prevCandle.high, prevCandle.low, prevCandle.close);
    }
  }

  if (flags.usePivot && flags.retestConfirm && snapshot.pivotLevels) {
    const r1 = snapshot.pivotLevels.r1;
    const lookback = candles.slice(-21, -1); // son 20 mum, mevcut hariç
    const breakoutIdx = lookback.findIndex((c) => c.close > r1);
    if (breakoutIdx !== -1 && breakoutIdx < lookback.length - 1) {
      // Kırılım sonrası fiyat R1'e geri döndü mü? (±%0.5 tolerans)
      const tolerance = r1 * 0.005;
      const retestHappened = lookback.slice(breakoutIdx + 1).some(
        (c) => c.low <= r1 + tolerance
      );
      const currentClose = candles[candles.length - 1]?.close ?? 0;
      snapshot.retestValid = retestHappened && currentClose > r1;
    } else {
      snapshot.retestValid = false;
    }
  }

  return snapshot;
}
