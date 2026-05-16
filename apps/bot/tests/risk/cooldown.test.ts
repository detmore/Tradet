import { describe, it, expect, vi } from "vitest";
import { ConsecutiveLossTracker } from "../../src/risk/cooldown.js";
import type { Logger } from "../../src/observability/logger.js";

// Minimal stub that satisfies the Logger type without touching @trade/config or pino
function makeLogger(): Logger {
  const noop = () => undefined;
  return { info: noop, warn: noop, error: noop, debug: noop, trace: noop, fatal: noop } as unknown as Logger;
}

describe("ConsecutiveLossTracker", () => {
  it("not in cooldown by default", () => {
    const tracker = new ConsecutiveLossTracker(makeLogger());
    expect(tracker.isInCooldown()).toBe(false);
  });

  it("records losses without activating cooldown automatically", () => {
    const tracker = new ConsecutiveLossTracker(makeLogger());
    tracker.recordLoss();
    tracker.recordLoss();
    tracker.recordLoss();
    expect(tracker.getConsecutiveLosses()).toBe(3);
    expect(tracker.isInCooldown()).toBe(false);
  });

  it("activateCooldown puts tracker in cooldown and resets loss counter", () => {
    const tracker = new ConsecutiveLossTracker(makeLogger());
    tracker.recordLoss();
    tracker.recordLoss();
    tracker.activateCooldown(4);
    expect(tracker.isInCooldown()).toBe(true);
    expect(tracker.getConsecutiveLosses()).toBe(0);
  });

  it("win resets consecutive losses", () => {
    const tracker = new ConsecutiveLossTracker(makeLogger());
    tracker.recordLoss();
    tracker.recordLoss();
    tracker.recordWin();
    expect(tracker.getConsecutiveLosses()).toBe(0);
  });

  it("cooldown expires after duration", () => {
    vi.useFakeTimers();
    const tracker = new ConsecutiveLossTracker(makeLogger());
    // 0.001 hours = 3.6 seconds
    tracker.activateCooldown(0.001);
    expect(tracker.isInCooldown()).toBe(true);
    vi.advanceTimersByTime(4_000);
    expect(tracker.isInCooldown()).toBe(false);
    vi.useRealTimers();
  });

  it("consecutive loss count increments correctly", () => {
    const tracker = new ConsecutiveLossTracker(makeLogger());
    tracker.recordLoss();
    expect(tracker.getConsecutiveLosses()).toBe(1);
    tracker.recordLoss();
    expect(tracker.getConsecutiveLosses()).toBe(2);
  });
});
