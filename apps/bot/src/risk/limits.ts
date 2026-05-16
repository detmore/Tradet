import type { Logger } from "../observability/logger.js";

export class DailyLimitsTracker {
  private dailyRealizedLoss = 0;
  private openExposure = 0;
  private resetDate = new Date().toDateString();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  recordLoss(amount: number): void {
    this.checkDateReset();
    this.dailyRealizedLoss += Math.abs(amount);
  }

  recordOpenPosition(notionalValue: number): void {
    this.openExposure += notionalValue;
  }

  releaseOpenPosition(notionalValue: number): void {
    this.openExposure = Math.max(0, this.openExposure - notionalValue);
  }

  isDailyLossExceeded(balance: number, maxDailyLossPercent: number): boolean {
    this.checkDateReset();
    return this.dailyRealizedLoss / balance >= maxDailyLossPercent;
  }

  isExposureLimitExceeded(balance: number, maxExposurePercent: number): boolean {
    return this.openExposure / balance >= maxExposurePercent;
  }

  reset(): void {
    this.dailyRealizedLoss = 0;
    this.openExposure = 0;
    this.logger.info("Daily limits tracker reset");
  }

  private checkDateReset(): void {
    const today = new Date().toDateString();
    if (today !== this.resetDate) {
      this.dailyRealizedLoss = 0;
      this.resetDate = today;
      this.logger.info("Daily loss counter reset");
    }
  }
}
