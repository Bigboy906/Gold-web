const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const ALPHA_KEY = "P4CHRPJKUEQAO6NN";

let latestSignal = null;

async function fetchCandles(interval) {
  const fetch = (await import("node-fetch")).default;

  const intervalMap = {
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1H": "60min",
    "4H": "60min",
  };

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=XAUUSD&interval=${intervalMap[interval]}&outputsize=compact&apikey=${ALPHA_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  console.log("API keys:", Object.keys(data));

  const key = Object.keys(data).find(k => k.includes("Time Series"));

  if (!key) {
    console.log("Full response:", JSON.stringify(data).slice(0, 500));
    return null;
  }

  const series = data[key];
  const candles = Object.entries(series).map(([time, val]) => ({
    time,
    open: parseFloat(val["1. open"]),
    high: parseFloat(val["2. high"]),
    low: parseFloat(val["3. low"]),
    close: parseFloat(val["4. close"]),
  })).reverse();

  return candles;
}

function calcRSI(candles, period = 14) {
  if (candles.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

function calcSuperTrend(candles, period = 10, multiplier = 3) {
  if (candles.length < period) return { trend: "Bullish", direction: -1, atr: 10 };

  let atr = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    atr += candles[i].high - candles[i].low;
  }
  atr = atr / period;

  const last = candles[candles.length - 1];
  const hl2 = (last.high + last.low) / 2;
  const lowerBand = hl2 - multiplier * atr;

  const trend = last.close > lowerBand ? "Bullish" : "Bearish";
  const direction = trend === "Bullish" ? -1 : 1;

  return { trend, direction, atr };
}

app.get("/analyse/:timeframe", async (req, res) => {
  const { timeframe } = req.params;

  try {
    const candles = await fetchCandles(timeframe);

    if (!candles || candles.length < 20) {
      return res.json({ error: "Could not fetch Gold data. Alpha Vantage may not support this symbol on free tier." });
    }

    const rsi = calcRSI(candles);
    const { trend, direction, atr } = calcSuperTrend(candles);
    const last = candles[candles.length - 1];
    const entry = last.close;

    const isBuy = direction === -1 && rsi > 50;
    const isSell = direction === 1 && rsi < 50;

    if (!isBuy && !isSell) {
      return res.json({ message: "No clear signal on this timeframe. Wait for better conditions." });
    }

    const signalDirection = isBuy ? "BUY" : "SELL";
    const takeProfit = isBuy ? entry + atr * 2 : entry - atr * 2;
    const stopLoss = isBuy ? entry - atr : entry + atr;
    const confidence = Math.min(95, Math.round(50 + Math.abs(rsi - 50)));

    const analysis = `XAUUSD is in a ${trend.toLowerCase()} trend on the ${timeframe} timeframe. RSI is at ${rsi.toFixed(1)}, confirming ${signalDirection === "BUY" ? "bullish" : "bearish"} momentum. SuperTrend signals a ${signalDirection}. Entry near ${entry.toFixed(2)}, targeting ${takeProfit.toFixed(2)} with stop at ${stopLoss.toFixed(2)}.`;

    const signal = {
      pair: "XAU/USD",
      direction: signalDirection,
      entry: entry.toFixed(2),
      takeProfit: takeProfit.toFixed(2),
      stopLoss: stopLoss.toFixed(2),
      rr: "1:2",
      confidence,
      pattern: "SuperTrend",
      trend,
      rsi: rsi.toFixed(1),
      timeframe,
      analysis,
      timestamp: new Date().toISOString(),
    };

    latestSignal = signal;
    res.json(signal);

  } catch (err) {
    console.error(err);
    res.json({ error: "Analysis failed: " + err.message });
  }
});

app.post("/webhook", (req, res) => {
  latestSignal = { ...req.body, timestamp: new Date().toISOString() };
  res.json({ status: "ok" });
});

app.get("/signal", (req, res) => {
  if (latestSignal) res.json(latestSignal);
  else res.json({ message: "No signal yet" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));