import { describe, it, expect } from "vitest";
import { DailyLimitsTracker } from "../../src/risk/limits.js";
import type { Logger } from "../../src/observability/logger.js";

// Minimal stub that satisfies the Logger type without touching @trade/config or pino
function makeLogger(): Logger {
  const noop = () => undefined;
  return { info: noop, warn: noop, error: noop, debug: noop, trace: noop, fatal: noop } as unknown as Logger;
}

describe("DailyLimitsTracker", () => {
  it("daily loss not exceeded by default", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    expect(tracker.isDailyLossExceeded(10_000, 0.02)).toBe(false);
  });

  it("detects daily loss exceeded", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordLoss(300); // 3% of 10_000
    expect(tracker.isDailyLossExceeded(10_000, 0.02)).toBe(true);
  });

  it("daily loss not exceeded when under threshold", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordLoss(100); // 1% of 10_000
    expect(tracker.isDailyLossExceeded(10_000, 0.02)).toBe(false);
  });

  it("exposure not exceeded by default", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    expect(tracker.isExposureLimitExceeded(10_000, 0.03)).toBe(false);
  });

  it("detects exposure exceeded", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordOpenPosition(400); // 4% of 10_000
    expect(tracker.isExposureLimitExceeded(10_000, 0.03)).toBe(true);
  });

  it("releases open position reduces exposure", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordOpenPosition(400);
    tracker.releaseOpenPosition(400);
    expect(tracker.isExposureLimitExceeded(10_000, 0.03)).toBe(false);
  });

  it("multiple losses accumulate correctly", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordLoss(100);
    tracker.recordLoss(100);
    // 200 / 10_000 = 2% which equals the threshold (>= check)
    expect(tracker.isDailyLossExceeded(10_000, 0.02)).toBe(true);
  });

  it("multiple open positions accumulate correctly", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordOpenPosition(150);
    tracker.recordOpenPosition(150);
    // 300 / 10_000 = 3% which equals the threshold (>= check)
    expect(tracker.isExposureLimitExceeded(10_000, 0.03)).toBe(true);
  });

  it("releaseOpenPosition does not go below zero", () => {
    const tracker = new DailyLimitsTracker(makeLogger());
    tracker.recordOpenPosition(100);
    tracker.releaseOpenPosition(500); // release more than added
    expect(tracker.isExposureLimitExceeded(10_000, 0.03)).toBe(false);
  });
});
