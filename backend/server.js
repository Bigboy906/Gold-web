const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const TWELVE_KEY = "865285eec7c449129e724b96f92c56d4";
const resend = new Resend(process.env.RESEND_KEY);

let latestSignal = null;

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
      <p style="color: #9ca3af; font-size: 13px;"><strong style="color: #a78bfa;">Bias:</strong> ${signal.trend}</p>
      <p style="color: #9ca3af; font-size: 13px;"><strong style="color: #a78bfa;">Entry Reasons:</strong> ${signal.reasons}</p>
      <p style="color: #9ca3af; font-size: 13px;"><strong style="color: #a78bfa;">Analysis:</strong> ${signal.analysis}</p>
      <p style="color: #6b7280; font-size: 11px; margin-top: 16px;">Sent at ${new Date().toUTCString()}</p>
    </div>
  `;
  try {
    await resend.emails.send({
      from: "GoldSignal <onboarding@resend.dev>",
      to: ["samwelkimani659@gmail.com"],
      subject: `⚡ Signal: ${signal.direction} ${signal.pair} @ ${signal.entry}`,
      html,
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.error("Email error:", err.message);
  }
}

async function fetchCandles(pair, interval, outputsize = 100) {
  const fetch = (await import("node-fetch")).default;
  const intervalMap = { "5m": "5min", "15m": "15min", "30m": "30min", "1H": "1h", "4H": "4h" };
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${intervalMap[interval]}&outputsize=${outputsize}&apikey=${TWELVE_KEY}`;
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
  for (let i = period; i < candles.length; i++) ema = candles[i].close * k + ema * (1 - k);
  return ema;
}

function calcATR(candles, period = 14) {
  if (candles.length < period) return 1;
  let atr = 0;
  for (let i = candles.length - period; i < candles.length; i++) atr += candles[i].high - candles[i].low;
  return atr / period;
}

function detectBOS(candles) {
  if (candles.length < 5) return null;
  const len = candles.length;
  const prev = candles[len - 3], curr = candles[len - 1];
  if (curr.high > prev.high) return "Bullish BOS";
  if (curr.low < prev.low) return "Bearish BOS";
  return null;
}

function detectCHOCH(candles) {
  if (candles.length < 6) return null;
  const len = candles.length;
  const c1 = candles[len - 4], c2 = candles[len - 3], c3 = candles[len - 2], c4 = candles[len - 1];
  if (c1.low < c2.low && c4.high > c3.high) return "Bullish CHOCH";
  if (c1.high > c2.high && c4.low < c3.low) return "Bearish CHOCH";
  return null;
}

function detectMSS(candles) {
  if (candles.length < 8) return null;
  const len = candles.length;
  const recent = candles.slice(len - 8);
  const highestHigh = Math.max(...recent.slice(0, 5).map(c => c.high));
  const lowestLow = Math.min(...recent.slice(0, 5).map(c => c.low));
  const last = recent[recent.length - 1], prev = recent[recent.length - 2];
  if (prev.low < lowestLow && last.close > highestHigh) return "Bullish MSS";
  if (prev.high > highestHigh && last.close < lowestLow) return "Bearish MSS";
  return null;
}

function detectIDM(candles) {
  if (candles.length < 6) return null;
  const len = candles.length;
  const c1 = candles[len - 5], c2 = candles[len - 4], c3 = candles[len - 3], c4 = candles[len - 2], c5 = candles[len - 1];
  const recentLow = Math.min(c1.low, c2.low, c3.low);
  if (c4.low < recentLow && c5.close > c3.high) return { type: "Bullish IDM", direction: "BUY" };
  const recentHigh = Math.max(c1.high, c2.high, c3.high);
  if (c4.high > recentHigh && c5.close < c3.low) return { type: "Bearish IDM", direction: "SELL" };
  return null;
}

function detectSupplyDemand(candles) {
  if (candles.length < 10) return null;
  const len = candles.length;
  const lookback = candles.slice(len - 10);
  let demandZone = null, supplyZone = null;
  for (let i = 1; i < lookback.length - 1; i++) {
    const curr = lookback[i], next = lookback[i + 1];
    if (curr.close > curr.open && next.close > next.open && next.close - next.open > (next.high - next.low) * 0.6) {
      demandZone = { high: curr.high, low: curr.low, direction: "BUY", type: "Demand Zone" };
    }
    if (curr.close < curr.open && next.close < next.open && next.open - next.close > (next.high - next.low) * 0.6) {
      supplyZone = { high: curr.high, low: curr.low, direction: "SELL", type: "Supply Zone" };
    }
  }
  return { demandZone, supplyZone };
}

function detectEqualHighsLows(candles) {
  if (candles.length < 10) return null;
  const len = candles.length;
  const lookback = candles.slice(len - 15);
  const threshold = 0.002;
  let equalHighs = null, equalLows = null;
  for (let i = 0; i < lookback.length - 3; i++) {
    for (let j = i + 2; j < lookback.length; j++) {
      if (Math.abs(lookback[i].high - lookback[j].high) / lookback[i].high < threshold) {
        equalHighs = { level: lookback[i].high, type: "Equal Highs", direction: "SELL" };
      }
      if (Math.abs(lookback[i].low - lookback[j].low) / lookback[i].low < threshold) {
        equalLows = { level: lookback[i].low, type: "Equal Lows", direction: "BUY" };
      }
    }
  }
  return { equalHighs, equalLows };
}

function detectBreakerBlock(candles) {
  if (candles.length < 6) return null;
  const len = candles.length;
  for (let i = len - 6; i < len - 2; i++) {
    const candle = candles[i], next = candles[i + 1], current = candles[len - 1];
    if (candle.close < candle.open && next.close < candle.low && current.close > candle.low && current.close < candle.high) {
      return { type: "Bullish Breaker Block", high: candle.high, low: candle.low, direction: "BUY" };
    }
    if (candle.close > candle.open && next.close > candle.high && current.close < candle.high && current.close > candle.low) {
      return { type: "Bearish Breaker Block", high: candle.high, low: candle.low, direction: "SELL" };
    }
  }
  return null;
}

function detectOrderBlock(candles) {
  if (candles.length < 4) return null;
  const len = candles.length;
  for (let i = len - 4; i < len - 1; i++) {
    const candle = candles[i], next = candles[i + 1];
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
  const prev = candles[len - 2], curr = candles[len - 1];
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
  const c1 = candles[len - 3], c3 = candles[len - 1];
  if (c3.low > c1.high) return { type: "Bullish FVG", direction: "BUY" };
  if (c3.high < c1.low) return { type: "Bearish FVG", direction: "SELL" };
  return null;
}

function calcOrderflow(candles) {
  let buyVolume = 0, sellVolume = 0, cvd = 0;
  candles.slice(-20).forEach(c => {
    const range = c.high - c.low || 1;
    const bullish = (c.close - c.low) / range;
    const bearish = (c.high - c.close) / range;
    buyVolume += bullish;
    sellVolume += bearish;
    cvd += bullish - bearish;
  });
  const total = buyVolume + sellVolume || 1;
  const buyPct = Math.round((buyVolume / total) * 100);
  return { buyPct, sellPct: 100 - buyPct, cvd: (cvd * 1000).toFixed(1), trend: cvd > 0 ? "positive" : "negative" };
}

function calcTP(entry, sl, rr, direction) {
  const risk = Math.abs(entry - sl);
  const rrMap = { "1:1.5": 1.5, "1:2": 2, "1:3": 3, "1:3.5": 3.5 };
  return direction === "BUY" ? entry + risk * (rrMap[rr] || 2) : entry - risk * (rrMap[rr] || 2);
}

function buildAnalysis(htfBias, matchingSignals, biasDirection, htfRSI, ltfRSI, emaFilter, entry, stopLoss, takeProfit, rr, pair, extraContext, orderflow, htf, ltf) {
  const dir = biasDirection === "BUY" ? "bullish" : "bearish";
  const reasons = matchingSignals.map(s => s.type).join(", ");
  const emaText = emaFilter ? "EMA50 above EMA200 confirms the trend." : "EMA trend mixed but confluences are strong.";
  const rsiText = `${htf} RSI at ${htfRSI.toFixed(1)}, ${ltf} RSI at ${ltfRSI.toFixed(1)}, supporting ${dir} momentum.`;
  const extraText = extraContext.length > 0 ? `Additional confluence: ${extraContext.join(", ")}.` : "";
  const flowText = orderflow ? `Orderflow shows ${orderflow.buyPct}% buying vs ${orderflow.sellPct}% selling pressure.` : "";
  return `${pair} shows ${htfBias} on ${htf} — ${dir} structure confirmed. ${rsiText} ${emaText} ${extraText} ${flowText} Detected on ${ltf}: ${reasons}. Entry at ${entry.toFixed(2)}, SL at ${stopLoss.toFixed(2)}, TP at ${takeProfit.toFixed(2)} (${rr} R:R).`;
}

app.get("/smc/:rr", async (req, res) => {
  const { rr } = req.params;
  const pair = req.query.pair || "XAU/USD";
  const selectedTF = req.query.tf || "15m";

  const tfMap = {
    "5m":  { htf: "5m",  ltf: "5m" },
    "15m": { htf: "15m", ltf: "5m" },
    "30m": { htf: "30m", ltf: "15m" },
    "1H":  { htf: "1H",  ltf: "15m" },
    "4H":  { htf: "4H",  ltf: "1H" },
  };

  const { htf, ltf } = tfMap[selectedTF] || tfMap["15m"];

  try {
    const htfCandles = await fetchCandles(pair, htf, 100);
    const ltfCandles = await fetchCandles(pair, ltf, 100);
    if (!htfCandles || !ltfCandles) return res.json({ error: "Could not fetch data. Try again." });

    const bos = detectBOS(htfCandles);
    const choch = detectCHOCH(htfCandles);
    const mss = detectMSS(htfCandles);
    const htfBias = mss || bos || choch;
    const htfRSI = calcRSI(htfCandles);
    const ema50 = calcEMA(htfCandles, 50);
    const ema200 = calcEMA(htfCandles, 200);
    const htfSD = detectSupplyDemand(htfCandles);
    const htfEHL = detectEqualHighsLows(htfCandles);

    if (!htfBias) return res.json({ message: `No clear market structure on ${htf} for ${pair}. Wait for BOS, CHOCH or MSS.` });

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
    const idm = detectIDM(ltfCandles);
    const breaker = detectBreakerBlock(ltfCandles);
    const orderflow = calcOrderflow(ltfCandles);

    const allSignals = [ob, sweep, engulfing, wick, fvg, idm, breaker].filter(Boolean);
    const matchingSignals = allSignals.filter(s => s.direction === biasDirection);

    const extraContext = [];
    if (mss) extraContext.push(mss);
    if (htfSD?.demandZone && biasDirection === "BUY") extraContext.push(`${htf} Demand Zone`);
    if (htfSD?.supplyZone && biasDirection === "SELL") extraContext.push(`${htf} Supply Zone`);
    if (htfEHL?.equalLows && biasDirection === "BUY") extraContext.push("Equal Lows swept");
    if (htfEHL?.equalHighs && biasDirection === "SELL") extraContext.push("Equal Highs swept");

    if (matchingSignals.length === 0) {
      return res.json({
        message: `${pair} ${htf} bias: ${biasDirection} (${htfBias}). RSI: ${htfRSI.toFixed(1)}. EMA: ${emaFilter ? "Confirmed" : "Against bias"}. ${extraContext.join(", ")}. Waiting for ${ltf} entry signal...`
      });
    }

    const last = ltfCandles[ltfCandles.length - 1];
    const entry = last.close;

    let stopLoss;
    if (ob && ob.direction === biasDirection) {
      stopLoss = biasDirection === "BUY" ? ob.low - (ltfATR * 0.5) : ob.high + (ltfATR * 0.5);
    } else if (breaker && breaker.direction === biasDirection) {
      stopLoss = biasDirection === "BUY" ? breaker.low - (ltfATR * 0.3) : breaker.high + (ltfATR * 0.3);
    } else {
      const swing = biasDirection === "BUY"
        ? Math.min(...ltfCandles.slice(-5).map(c => c.low)) - (ltfATR * 0.5)
        : Math.max(...ltfCandles.slice(-5).map(c => c.high)) + (ltfATR * 0.5);
      stopLoss = swing;
    }

    const takeProfit = calcTP(entry, stopLoss, rr, biasDirection);

    let confidence = 50;
    if (matchingSignals.length >= 2) confidence += 10;
    if (matchingSignals.length >= 3) confidence += 10;
    if (matchingSignals.length >= 4) confidence += 5;
    if (emaFilter) confidence += 8;
    if (rsiFilter) confidence += 7;
    if (mss) confidence += 10;
    if (idm) confidence += 8;
    if (breaker) confidence += 7;
    if (extraContext.length > 0) confidence += 5;
    if (biasDirection === "BUY" && ltfRSI > 50) confidence += 5;
    if (biasDirection === "SELL" && ltfRSI < 50) confidence += 5;
    confidence = Math.min(95, confidence);

    const reasons = matchingSignals.map(s => s.type).join(", ");
    const analysis = buildAnalysis(htfBias, matchingSignals, biasDirection, htfRSI, ltfRSI, emaFilter, entry, stopLoss, takeProfit, rr, pair, extraContext, orderflow, htf, ltf);

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
      htf, ltf,
      ema50: ema50 ? ema50.toFixed(2) : null,
      ema200: ema200 ? ema200.toFixed(2) : null,
      emaConfirmed: emaFilter,
      mss: mss || null,
      idm: idm ? idm.type : null,
      breaker: breaker ? breaker.type : null,
      supplyDemand: biasDirection === "BUY" ? (htfSD?.demandZone ? `${htf} Demand Zone` : null) : (htfSD?.supplyZone ? `${htf} Supply Zone` : null),
      equalLevels: biasDirection === "BUY" ? (htfEHL?.equalLows ? "Equal Lows" : null) : (htfEHL?.equalHighs ? "Equal Highs" : null),
      orderflow,
      timeframe: `${htf}/${ltf}`,
      analysis,
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

app.get("/mtf/:pair", async (req, res) => {
  const pair = decodeURIComponent(req.params.pair);
  try {
    const timeframes = ["5m", "15m", "1H", "4H"];
    const results = [];
    for (const tf of timeframes) {
      const candles = await fetchCandles(pair, tf, 50);
      if (!candles) { results.push({ tf, direction: "N/A", confidence: 0 }); continue; }
      const bos = detectBOS(candles);
      const choch = detectCHOCH(candles);
      const mss = detectMSS(candles);
      const rsi = calcRSI(candles);
      const ema50 = calcEMA(candles, 50);
      const ema200 = calcEMA(candles, 200);
      const bias = mss || bos || choch;
      if (!bias) { results.push({ tf, direction: "NEUTRAL", confidence: 50, rsi: rsi.toFixed(1) }); continue; }
      const direction = bias.includes("Bullish") ? "BUY" : "SELL";
      let confidence = 50;
      if (ema50 && ema200) {
        if (direction === "BUY" && ema50 > ema200) confidence += 15;
        if (direction === "SELL" && ema50 < ema200) confidence += 15;
      }
      if (direction === "BUY" && rsi > 50) confidence += 15;
      if (direction === "SELL" && rsi < 50) confidence += 15;
      if (mss) confidence += 10;
      confidence = Math.min(95, confidence);
      results.push({ tf, direction, confidence, bias, rsi: rsi.toFixed(1) });
    }
    const buys = results.filter(r => r.direction === "BUY").length;
    const sells = results.filter(r => r.direction === "SELL").length;
    const overall = buys > sells ? "BUY" : sells > buys ? "SELL" : "NEUTRAL";
    const confluenceScore = `${Math.max(buys, sells)}/${timeframes.length}`;
    res.json({ pair, timeframes: results, overall, confluenceScore });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/sentiment/:pair", async (req, res) => {
  const pair = decodeURIComponent(req.params.pair);
  try {
    const fetch = (await import("node-fetch")).default;
    const query = pair.includes("XAU") ? "gold price" : "bitcoin price";
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&apikey=free`;
    const r = await fetch(url);
    const data = await r.json();
    const bullishWords = ["rise", "rally", "surge", "bullish", "gain", "high", "up", "buy", "growth", "strong", "record", "soar"];
    const bearishWords = ["fall", "drop", "crash", "bearish", "loss", "low", "down", "sell", "weak", "decline", "plunge", "tumble"];
    let bullScore = 0, bearScore = 0;
    const headlines = [];
    const articles = data.articles || [];
    articles.slice(0, 10).forEach(article => {
      const title = article.title?.toLowerCase() || "";
      headlines.push(article.title);
      bullishWords.forEach(w => { if (title.includes(w)) bullScore++; });
      bearishWords.forEach(w => { if (title.includes(w)) bearScore++; });
    });
    const total = bullScore + bearScore || 1;
    const sentiment = bullScore > bearScore ? "Bullish" : bearScore > bullScore ? "Bearish" : "Neutral";
    const sentimentScore = Math.round((Math.max(bullScore, bearScore) / total) * 100);
    res.json({ pair, sentiment, sentimentScore, bullScore, bearScore, headlines: headlines.slice(0, 5) });
  } catch (err) {
    res.json({ sentiment: "Neutral", sentimentScore: 50, headlines: [], error: err.message });
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