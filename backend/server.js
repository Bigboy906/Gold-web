const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const TWELVE_KEY = "865285eec7c449129e724b96f92c56d4";

let latestSignal = null;

async function fetchCandles(interval, outputsize = 100) {
  const fetch = (await import("node-fetch")).default;
  const intervalMap = {
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1H": "1h",
    "4H": "4h",
  };
  const url = `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${intervalMap[interval]}&outputsize=${outputsize}&apikey=${TWELVE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "error" || !data.values) return null;
  return data.values.map(v => ({
    time: v.datetime,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
  })).reverse();
}

// RSI
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

// EMA
function calcEMA(candles, period) {
  if (candles.length < period) return null;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

// ATR
function calcATR(candles, period = 14) {
  if (candles.length < period) return 1;
  let atr = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    atr += candles[i].high - candles[i].low;
  }
  return atr / period;
}

// BOS
function detectBOS(candles) {
  if (candles.length < 5) return null;
  const len = candles.length;
  const prev = candles[len - 3];
  const curr = candles[len - 1];
  if (curr.high > prev.high) return "Bullish BOS";
  if (curr.low < prev.low) return "Bearish BOS";
  return null;
}

// CHOCH
function detectCHOCH(candles) {
  if (candles.length < 6) return null;
  const len = candles.length;
  const c1 = candles[len - 4];
  const c2 = candles[len - 3];
  const c3 = candles[len - 2];
  const c4 = candles[len - 1];
  if (c1.low < c2.low && c4.high > c3.high) return "Bullish CHOCH";
  if (c1.high > c2.high && c4.low < c3.low) return "Bearish CHOCH";
  return null;
}

// Order Block
function detectOrderBlock(candles) {
  if (candles.length < 4) return null;
  const len = candles.length;
  for (let i = len - 4; i < len - 1; i++) {
    const candle = candles[i];
    const next = candles[i + 1];
    if (candle.close < candle.open && next.close > next.open && next.close > candle.high) {
      return { type: "Bullish OB", high: candle.high, low: candle.low, direction: "BUY" };
    }
    if (candle.close > candle.open && next.close < next.open && next.close < candle.low) {
      return { type: "Bearish OB", high: candle.high, low: candle.low, direction: "SELL" };
    }
  }
  return null;
}

// Liquidity Sweep
function detectLiquiditySweep(candles) {
  if (candles.length < 5) return null;
  const len = candles.length;
  const last = candles[len - 1];
  const swingHigh = Math.max(...candles.slice(len - 5, len - 1).map(c => c.high));
  const swingLow = Math.min(...candles.slice(len - 5, len - 1).map(c => c.low));
  if (last.high > swingHigh && last.close < swingHigh) return { type: "Bearish Liquidity Sweep", direction: "SELL" };
  if (last.low < swingLow && last.close > swingLow) return { type: "Bullish Liquidity Sweep", direction: "BUY" };
  return null;
}

// Engulfing
function detectEngulfing(candles) {
  if (candles.length < 2) return null;
  const len = candles.length;
  const prev = candles[len - 2];
  const curr = candles[len - 1];
  if (prev.close < prev.open && curr.close > curr.open && curr.close > prev.open && curr.open < prev.close) {
    return { type: "Bullish Engulfing", direction: "BUY" };
  }
  if (prev.close > prev.open && curr.close < curr.open && curr.close < prev.open && curr.open > prev.close) {
    return { type: "Bearish Engulfing", direction: "SELL" };
  }
  return null;
}

// Rejection Wick
function detectRejectionWick(candles) {
  if (candles.length < 1) return null;
  const last = candles[candles.length - 1];
  const body = Math.abs(last.close - last.open);
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;
  if (upperWick > body * 2 && upperWick > lowerWick) return { type: "Bearish Rejection Wick", direction: "SELL" };
  if (lowerWick > body * 2 && lowerWick > upperWick) return { type: "Bullish Rejection Wick", direction: "BUY" };
  return null;
}

// FVG
function detectFVG(candles) {
  if (candles.length < 3) return null;
  const len = candles.length;
  const c1 = candles[len - 3];
  const c2 = candles[len - 2];
  const c3 = candles[len - 1];
  if (c3.low > c1.high) return { type: "Bullish FVG", direction: "BUY", top: c3.low, bottom: c1.high };
  if (c3.high < c1.low) return { type: "Bearish FVG", direction: "SELL", top: c1.low, bottom: c3.high };
  return null;
}

// TP calculation
function calcTP(entry, sl, rr, direction) {
  const risk = Math.abs(entry - sl);
  const rrMap = { "1:1.5": 1.5, "1:2": 2, "1:3": 3, "1:3.5": 3.5 };
  const multiplier = rrMap[rr] || 2;
  return direction === "BUY" ? entry + risk * multiplier : entry - risk * multiplier;
}

// SMC Analysis
app.get("/smc/:rr", async (req, res) => {
  const { rr } = req.params;

  try {
    const htfCandles = await fetchCandles("15m", 100);
    const ltfCandles = await fetchCandles("5m", 100);

    if (!htfCandles || !ltfCandles) {
      return res.json({ error: "Could not fetch data. Try again." });
    }

    // HTF indicators
    const bos = detectBOS(htfCandles);
    const choch = detectCHOCH(htfCandles);
    const htfBias = bos || choch;
    const htfRSI = calcRSI(htfCandles);
    const ema50 = calcEMA(htfCandles, 50);
    const ema200 = calcEMA(htfCandles, 200);
    const lastHTF = htfCandles[htfCandles.length - 1];

    if (!htfBias) {
      return res.json({ message: "No clear market structure on 15m. Wait for BOS or CHOCH." });
    }

    const biasDirection = htfBias.includes("Bullish") ? "BUY" : "SELL";

    // EMA trend filter
    const emaFilter = ema50 && ema200
      ? biasDirection === "BUY" ? ema50 > ema200 : ema50 < ema200
      : true;

    // RSI filter — avoid overbought on BUY, oversold on SELL
    const rsiFilter = biasDirection === "BUY" ? htfRSI < 75 : htfRSI > 25;

    // LTF indicators
    const ltfRSI = calcRSI(ltfCandles);
    const ltfATR = calcATR(ltfCandles);
    const ob = detectOrderBlock(ltfCandles);
    const sweep = detectLiquiditySweep(ltfCandles);
    const engulfing = detectEngulfing(ltfCandles);
    const wick = detectRejectionWick(ltfCandles);
    const fvg = detectFVG(ltfCandles);

    // Match entry signals with bias
    const allSignals = [ob, sweep, engulfing, wick, fvg].filter(Boolean);
    const matchingSignals = allSignals.filter(s => s.direction === biasDirection);

    if (matchingSignals.length === 0) {
      return res.json({
        message: `15m bias is ${biasDirection} (${htfBias}). RSI: ${htfRSI.toFixed(1)}. EMA trend: ${emaFilter ? "Confirmed" : "Against bias"}. Waiting for 5m entry...`
      });
    }

    const last = ltfCandles[ltfCandles.length - 1];
    const entry = last.close;

    // Stop loss
    let stopLoss;
    if (ob && ob.direction === biasDirection) {
      stopLoss = biasDirection === "BUY" ? ob.low - (ltfATR * 0.5) : ob.high + (ltfATR * 0.5);
    } else {
      const swing = biasDirection === "BUY"
        ? Math.min(...ltfCandles.slice(-5).map(c => c.low)) - (ltfATR * 0.5)
        : Math.max(...ltfCandles.slice(-5).map(c => c.high)) + (ltfATR * 0.5);
      stopLoss = swing;
    }

    const takeProfit = calcTP(entry, stopLoss, rr, biasDirection);

    // Confidence score
    let confidence = 50;
    if (matchingSignals.length >= 2) confidence += 15;
    if (matchingSignals.length >= 3) confidence += 10;
    if (emaFilter) confidence += 10;
    if (rsiFilter) confidence += 10;
    if (biasDirection === "BUY" && ltfRSI > 50) confidence += 5;
    if (biasDirection === "SELL" && ltfRSI < 50) confidence += 5;
    confidence = Math.min(95, confidence);

    const reasons = matchingSignals.map(s => s.type).join(", ");
    const emaStatus = ema50 && ema200 ? `EMA50 ${ema50 > ema200 ? "above" : "below"} EMA200` : "";

    const analysis = `15m shows ${htfBias} with RSI at ${htfRSI.toFixed(1)}. ${emaStatus}. On 5m, detected: ${reasons}. ${biasDirection === "BUY" ? "Bullish" : "Bearish"} confluence confirmed. Entry at ${entry.toFixed(2)}, SL at ${stopLoss.toFixed(2)}, TP at ${takeProfit.toFixed(2)} (${rr} R:R).`;

    const signal = {
      pair: "XAU/USD",
      direction: biasDirection,
      entry: entry.toFixed(2),
      takeProfit: takeProfit.toFixed(2),
      stopLoss: stopLoss.toFixed(2),
      rr,
      confidence,
      pattern: matchingSignals[0].type,
      trend: htfBias,
      reasons,
      htfRSI: htfRSI.toFixed(1),
      ltfRSI: ltfRSI.toFixed(1),
      ema50: ema50 ? ema50.toFixed(2) : null,
      ema200: ema200 ? ema200.toFixed(2) : null,
      emaConfirmed: emaFilter,
      timeframe: "15m/5m",
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
    const fetch = (await import("node-fetch")).default;
    const url = `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${TWELVE_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json({ price: data.price });
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