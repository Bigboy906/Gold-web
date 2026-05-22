const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const TWELVE_KEY = "865285eec7c449129e724b96f92c56d4";

let latestSignal = null;

async function fetchCandles(interval) {
  const fetch = (await import("node-fetch")).default;

  const intervalMap = {
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1H": "1h",
    "4H": "4h",
  };

  const url = `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${intervalMap[interval]}&outputsize=50&apikey=${TWELVE_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  console.log("API status:", data.status, "keys:", Object.keys(data));

  if (data.status === "error" || !data.values) {
    console.log("Error:", data.message);
    return null;
  }

  const candles = data.values.map(v => ({
    time: v.datetime,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
  })).reverse();

  return candles;
}

async function fetchLivePrice() {
  const fetch = (await import("node-fetch")).default;
  const url = `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${TWELVE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.price || null;
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
      return res.json({ error: "Not enough data. Try again in a moment." });
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

app.get("/price", async (req, res) => {
  try {
    const price = await fetchLivePrice();
    res.json({ price });
  } catch (err) {
    res.json({ error: "Price fetch failed" });
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