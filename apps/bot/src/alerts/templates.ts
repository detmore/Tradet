export const templates = {
  tradeOpened: (
    symbol: string,
    side: string,
    qty: string,
    price: string,
    sl: string,
    tp: string
  ) =>
    `Trade Opened\n${symbol} ${side.toUpperCase()}\nQty: ${qty}\nEntry: ${price}\nSL: ${sl} | TP: ${tp}`,

  tradeClosed: (symbol: string, pnl: string, exitReason: string) =>
    `Trade Closed\n${symbol}\nPnL: ${pnl} USDT\nReason: ${exitReason}`,

  slHit: (symbol: string, price: string) => `Stop Loss Hit\n${symbol} @ ${price}`,

  tpHit: (symbol: string, price: string) => `Take Profit Hit\n${symbol} @ ${price}`,

  dailyLossLimit: (loss: string) =>
    `Daily Loss Limit Reached\nLoss: ${loss} USDT — bot paused for today`,

  killSwitch: () => `Kill Switch Activated\nAll trading halted`,

  botError: (message: string) => `Bot Error\n${message}`,

  connectionError: (exchange: string) => `Connection Error\nExchange: ${exchange}`,
};
