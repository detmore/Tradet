import type { Logger } from "../observability/logger.js";

export class ConsecutiveLossTracker {
  private consecutiveLosses = 0;
  private cooldownUntil: Date | null = null;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  recordLoss(): void {
    this.consecutiveLosses++;
    this.logger.warn({ consecutiveLosses: this.consecutiveLosses }, "Loss recorded");
  }

  recordWin(): void {
    this.consecutiveLosses = 0;
  }

  activateCooldown(durationHours: number): void {
    this.cooldownUntil = new Date(Date.now() + durationHours * 3_600_000);
    this.consecutiveLosses = 0;
    this.logger.warn({ cooldownUntil: this.cooldownUntil }, "Cooldown activated");
  }

  isInCooldown(): boolean {
    if (!this.cooldownUntil) return false;
    if (Date.now() >= this.cooldownUntil.getTime()) {
      this.cooldownUntil = null;
      return false;
    }
    return true;
  }

  getConsecutiveLosses(): number {
    return this.consecutiveLosses;
  }

  reset(): void {
    this.consecutiveLosses = 0;
    this.cooldownUntil = null;
    this.logger.info("Consecutive loss tracker reset");
  }
}
