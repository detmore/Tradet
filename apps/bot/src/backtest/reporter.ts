import type { BacktestResults } from "./types.js";

export function printResults(results: BacktestResults): void {
  const r = results;
  const line = "─".repeat(50);

  console.log(`\n${line}`);
  console.log(`BACKTEST RESULTS — ${r.symbol} ${r.timeframe}`);
  console.log(line);
  console.log(`Candles analyzed:  ${r.candlesAnalyzed}`);
  console.log(`Total trades:      ${r.tradesTotal}`);
  console.log(`Won / Lost:        ${r.tradesWon} / ${r.tradesLost}`);
  console.log(`Win rate:          ${r.winRate.toFixed(1)}%`);
  console.log(`Total PnL:         $${r.totalPnl.toFixed(2)} (${r.totalPnlPercent.toFixed(2)}%)`);
  console.log(`Avg win:           $${r.avgWin.toFixed(2)}`);
  console.log(`Avg loss:          $${r.avgLoss.toFixed(2)}`);
  console.log(`Expectancy:        $${r.expectancy.toFixed(2)}`);
  console.log(`Max drawdown:      $${r.maxDrawdown.toFixed(2)} (${r.maxDrawdownPercent.toFixed(2)}%)`);
  console.log(`Sharpe ratio:      ${r.sharpeRatio.toFixed(2)}`);
  console.log(line);

  if (r.trades.length > 0) {
    console.log("\nLast 5 trades:");
    r.trades.slice(-5).forEach((t, i) => {
      const sign = t.pnl >= 0 ? "+" : "";
      console.log(
        `  ${i + 1}. ${t.exitReason.toUpperCase().padEnd(12)} ` +
          `entry=$${t.entryPrice.toFixed(2)} exit=$${t.exitPrice.toFixed(2)} ` +
          `pnl=${sign}$${t.pnl.toFixed(2)} score=${t.score.toFixed(0)}`
      );
    });
  }

  console.log("");
}
