const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const TWELVE_KEY = "865285eec7c449129e724b96f92c56d4";

let latestSignal = null;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "samwelkimani659@gmail.com",
    pass: process.env.GMAIL_PASS,
  },
});

const transporter2 = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "morenochristopher851@gmail.com",
    pass: process.env.MORENO_PASS,
  },
});

async function sendSignalEmail(signal) {
  const direction = signal.direction === "BUY" ? "🟢 BUY" : "🔴 SELL";
  const html = `
    <div style="font-family: sans-serif; background: #0a0a0f; color: white; padding: 24px; border-radius: 12px; max-width: 500px;">
      <h2 style="color: #f59e0b;">⚡ GoldSignal Alert</h2>
      <h3 style="color: white;">${direction} — ${signal.pair}</h3>
      <p style="color: #9ca3af;">Timeframe: ${signal.timeframe} | Confidence: ${signal.confidence}%</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; color: #f59e0b; border: 1px solid #333;">Entry</td><td style="padding: 8px; color: white; border: 1px solid #333;">${signal.entry}</td></tr>
        <tr><td style="padding: 8px; color: #22c55e; border: 1px solid #333;">Take Profit</td><td style="padding: 8px; color: white; border: 1px solid #333;">${signal.takeProfit}</td></tr>
        <tr><td style="padding: 8px; color: #ef4444; border: 1px solid #333;">Stop Loss</td><td style="padding: 8px; color: white; border: 1px solid #333;">${signal.stopLoss}</td></tr>
        <tr><td style="padding: 8px; color: #9ca3af; border: 1px solid #333;">R:R</td><td style="padding: 8px; color: white; border: 1px solid #333;">${signal.rr}</td></tr>
      </table>
      <p style="color: #9ca3af; font-size: 13px;"><strong style="color: #a78bfa;">15m Bias:</strong> ${signal.trend}</p>
      <p style="color: #9ca3af; font-size: 13px;"><strong style="color: #a78bfa;">Entry Reasons:</strong> ${signal.reasons}</p>
      <p style="color: #9ca3af; font-size: 13px;"><strong style="color: #a78bfa;">Analysis:</strong> ${signal.analysis}</p>
      <p style="color: #6b7280; font-size: 11px; margin-top: 16px;">Sent at ${new Date().toUTCString()}</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: "samwelkimani659@gmail.com",
      to: ["samwelkimani659@gmail.com", "morenochristopher851@gmail.com"],
      subject: `⚡ Signal: ${signal.direction} ${signal.pair} @ ${signal.entry}`,
      html,
    });
  } catch (err) {
    console.error("Samwel email error:", err.message);
  }

  try {
    await transporter2.sendMail({
      from: "morenochristopher851@gmail.com",
      to: ["samwelkimani659@gmail.com", "morenochristopher851@gmail.com"],
      subject: `⚡ Signal: ${signal.direction} ${signal.pair} @ ${signal.entry}`,
      html,
    });
  } catch (err) {
    console.error("Moreno email error:", err.message);
  }
}

const PAIR_SYMBOLS = {
  "XAU/USD": "XAU/USD",
  "BTC/USD": "BTC/USD",
};

async function fetchCandles(pair, interval, outputsize = 100) {
  const fetch = (await import("node-fetch")).default;
  const intervalMap = {
    "5m": "5min", "15m": "15min", "30m": "30min", "1H": "1h", "4H": "4h",
  };
  const symbol = PAIR_SYMBOLS[pair] || "XAU/USD";
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${intervalMap[interval]}&outputsize=${outputsize}&apikey=${TWELVE_KEY}`;
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

function calcEMA(candles, period) {
  if (candles.length < period) return null;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

function calcATR(candles, period = 14) {
  if (candles.length < period) return 1;
  let atr = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    atr += candles[i].high - candles[i].low;
  }
  return atr / period;
}

function detectBOS(candles) {
  if (candles.length < 5) return null;
  const len = candles.length;
  const prev = candles[len - 3];
  const curr = candles[len - 1];
  if (curr.high > prev.high) return "Bullish BOS";
  if (curr.low < prev.low) return "Bearish BOS";
  return null;
}

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

function detectFVG(candles) {
  if (candles.length < 3) return null;
  const len = candles.length;
  const c1 = candles[len - 3];
  const c3 = candles[len - 1];
  if (c3.low > c1.high) return { type: "Bullish FVG", direction: "BUY" };
  if (c3.high < c1.low) return { type: "Bearish FVG", direction: "SELL" };
  return null;
}

function calcTP(entry, sl, rr, direction) {
  const risk = Math.abs(entry - sl);
  const rrMap = { "1:1.5": 1.5, "1:2": 2, "1:3": 3, "1:3.5": 3.5 };
  const multiplier = rrMap[rr] || 2;
  return direction === "BUY" ? entry + risk * multiplier : entry - risk * multiplier;
}

function buildAnalysis(htfBias, matchingSignals, biasDirection, htfRSI, ltfRSI, emaFilter, entry, stopLoss, takeProfit, rr, pair) {
  const dir = biasDirection === "BUY" ? "bullish" : "bearish";
  const reasons = matchingSignals.map(s => s.type).join(", ");
  const emaText = emaFilter ? "EMA50 is above EMA200, confirming the trend." : "EMA trend is mixed but other confluences are strong.";
  const rsiText = `The 15m RSI is at ${htfRSI.toFixed(1)} and 5m RSI is at ${ltfRSI.toFixed(1)}, both supporting ${dir} momentum.`;
  const entryText = `Entry at ${entry.toFixed(2)}, stop loss at ${stopLoss.toFixed(2)}, take profit at ${takeProfit.toFixed(2)} giving a ${rr} R:R.`;
  const reasonText = `On the 5m chart detected: ${reasons}. These align with the ${htfBias} on 15m.`;
  return `${pair} shows a ${htfBias}, indicating a ${dir} structure. ${rsiText} ${emaText} ${reasonText} ${entryText}`;
}

app.get("/smc/:rr", async (req, res) => {
  const { rr } = req.params;
  const pair = req.query.pair || "XAU/USD";
  try {
    const htfCandles = await fetchCandles(pair, "15m", 100);
    const ltfCandles = await fetchCandles(pair, "5m", 100);
    if (!htfCandles || !ltfCandles) {
      return res.json({ error: "Could not fetch data. Try again." });
    }
    const bos = detectBOS(htfCandles);
    const choch = detectCHOCH(htfCandles);
    const htfBias = bos || choch;
    const htfRSI = calcRSI(htfCandles);
    const ema50 = calcEMA(htfCandles, 50);
    const ema200 = calcEMA(htfCandles, 200);
    if (!htfBias) {
      return res.json({ message: `No clear market structure on 15m for ${pair}. Wait for BOS or CHOCH.` });
    }
    const biasDirection = htfBias.includes("Bullish") ? "BUY" : "SELL";
    const emaFilter = ema50 && ema200 ? (biasDirection === "BUY" ? ema50 > ema200 : ema50 < ema200) : true;
    const rsiFilter = biasDirection === "BUY" ? htfRSI < 75 : htfRSI > 25;
    const ltfRSI = calcRSI(ltfCandles);
    const ltfATR = calcATR(ltfCandles);
    const ob = detectOrderBlock(ltfCandles);
    const sweep = detectLiquiditySweep(ltfCandles);
    const engulfing = detectEngulfing(ltfCandles);
    const wick = detectRejectionWick(ltfCandles);
    const fvg = detectFVG(ltfCandles);
    const allSignals = [ob, sweep, engulfing, wick, fvg].filter(Boolean);
    const matchingSignals = allSignals.filter(s => s.direction === biasDirection);
    if (matchingSignals.length === 0) {
      return res.json({
        message: `${pair} 15m bias is ${biasDirection} (${htfBias}). RSI: ${htfRSI.toFixed(1)}. EMA: ${emaFilter ? "Confirmed" : "Against bias"}. Waiting for 5m entry...`
      });
    }
    const last = ltfCandles[ltfCandles.length - 1];
    const entry = last.close;
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
    let confidence = 50;
    if (matchingSignals.length >= 2) confidence += 15;
    if (matchingSignals.length >= 3) confidence += 10;
    if (emaFilter) confidence += 10;
    if (rsiFilter) confidence += 10;
    if (biasDirection === "BUY" && ltfRSI > 50) confidence += 5;
    if (biasDirection === "SELL" && ltfRSI < 50) confidence += 5;
    confidence = Math.min(95, confidence);
    const reasons = matchingSignals.map(s => s.type).join(", ");
    const analysis = buildAnalysis(htfBias, matchingSignals, biasDirection, htfRSI, ltfRSI, emaFilter, entry, stopLoss, takeProfit, rr, pair);
    const signal = {
      pair, direction: biasDirection,
      entry: entry.toFixed(2),
      takeProfit: takeProfit.toFixed(2),
      stopLoss: stopLoss.toFixed(2),
      rr, confidence,
      pattern: matchingSignals[0].type,
      trend: htfBias, reasons,
      htfRSI: htfRSI.toFixed(1),
      ltfRSI: ltfRSI.toFixed(1),
      ema50: ema50 ? ema50.toFixed(2) : null,
      ema200: ema200 ? ema200.toFixed(2) : null,
      emaConfirmed: emaFilter,
      timeframe: "15m/5m", analysis,
      timestamp: new Date().toISOString(),
    };
    latestSignal = signal;
    sendSignalEmail(signal).catch(err => console.error("Email error:", err));
    res.json(signal);
  } catch (err) {
    console.error(err);
    res.json({ error: "Analysis failed: " + err.message });
  }
});

app.get("/price", async (req, res) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const pair = req.query.pair || "XAU/USD";
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(pair)}&apikey=${TWELVE_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json({ price: data.price, pair });
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