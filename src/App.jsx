import { useState, useEffect } from "react";
import Chart from "./Chart";
import PositionSize from "./PositionSize";
import SignalHistory from "./SignalHistory";
import NewsFilter from "./NewsFilter";
import MultiTimeframe from "./MultiTimeframe";
import Sentiment from "./Sentiment";

const TIMEFRAMES = ["5m", "15m", "30m", "1H", "4H"];
const RR_OPTIONS = ["1:1.5", "1:2", "1:3", "1:3.5"];
const PAIRS = ["XAU/USD", "BTC/USD"];

function getSessionInfo() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcTime = utcHour + utcMin / 60;
  let session, killzone, sessionColor, killzoneColor;
  if (utcTime >= 0 && utcTime < 7) { session = "Asian"; sessionColor = "#a855f7"; }
  else if (utcTime >= 7 && utcTime < 13) { session = "London"; sessionColor = "#60a5fa"; }
  else if (utcTime >= 13 && utcTime < 22) { session = "New York"; sessionColor = "#fb923c"; }
  else { session = "Off Hours"; sessionColor = "#6b7280"; }
  if (utcTime >= 0 && utcTime < 3) { killzone = "Asian KZ"; killzoneColor = "#d8b4fe"; }
  else if (utcTime >= 7 && utcTime < 9) { killzone = "London Open KZ"; killzoneColor = "#93c5fd"; }
  else if (utcTime >= 12 && utcTime < 13.5) { killzone = "NY Open KZ"; killzoneColor = "#fdba74"; }
  else if (utcTime >= 15 && utcTime < 16) { killzone = "London Close KZ"; killzoneColor = "#f9a8d4"; }
  else { killzone = null; killzoneColor = null; }
  return { session, sessionColor, killzone, killzoneColor };
}

export default function App() {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRR, setSelectedRR] = useState("1:2");
  const [selectedTF, setSelectedTF] = useState("15m");
  const [selectedPair, setSelectedPair] = useState("XAU/USD");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [prices, setPrices] = useState({});
  const [time, setTime] = useState(new Date());
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const [activeTab, setActiveTab] = useState("signal");

  useEffect(() => {
    const clock = setInterval(() => { setTime(new Date()); setSessionInfo(getSessionInfo()); }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const [goldRes, btcRes] = await Promise.all([
          fetch("https://gold-web.onrender.com/price?pair=XAU%2FUSD"),
          fetch("https://gold-web.onrender.com/price?pair=BTC%2FUSD"),
        ]);
        const goldData = await goldRes.json();
        const btcData = await btcRes.json();
        setPrices({
          "XAU/USD": goldData.price ? parseFloat(goldData.price).toFixed(2) : null,
          "BTC/USD": btcData.price ? parseFloat(btcData.price).toFixed(0) : null,
        });
      } catch (err) {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  const analyse = async () => {
    setLoading(true);
    setError(null);
    setSignal(null);
    setMessage(null);
    try {
      const rrParam = selectedRR.replace(":", "%3A");
      const pairParam = encodeURIComponent(selectedPair);
      const res = await fetch(`https://gold-web.onrender.com/smc/${rrParam}?pair=${pairParam}&tf=${selectedTF}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.limitOrders) { setSignal(data); setMessage(data.message); setActiveTab("signal"); }
      else if (data.message) setMessage(data.message);
      else {
        setSignal(data);
        setActiveTab("signal");
        const saved = localStorage.getItem("signalHistory");
        const history = saved ? JSON.parse(saved) : [];
        history.push(data);
        localStorage.setItem("signalHistory", JSON.stringify(history));
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = prices[selectedPair];
  const tabs = ["signal", "chart", "tools", "market"];
  const tabLabels = { signal: "Signal", chart: "Chart", tools: "Tools", market: "Market" };

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "white", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(10,10,15,0.95)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: "#f59e0b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "black", fontSize: 14 }}>G</div>
          <span style={{ fontWeight: "bold", fontSize: 16 }}>GoldSignal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {currentPrice && <span style={{ color: "#f59e0b", fontWeight: "bold", fontSize: 13 }}>{selectedPair} ${currentPrice}</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, background: "#22c55e", borderRadius: "50%" }}></div>
            <span style={{ color: "#22c55e", fontSize: 12 }}>Live</span>
          </div>
        </div>
      </div>

      {/* Killzone Banner */}
      {sessionInfo.killzone && (
        <div style={{ margin: "8px 12px 0", borderRadius: 10, border: "1px solid rgba(249,115,22,0.4)", background: "rgba(249,115,22,0.1)", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🎯</span>
          <span style={{ color: "#fdba74", fontWeight: 600, fontSize: 11 }}>{sessionInfo.killzone} ACTIVE</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: sessionInfo.sessionColor }}>{sessionInfo.session}</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ margin: "10px 12px 0", background: "rgba(17,17,24,0.9)", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {PAIRS.map(pair => (
            <button key={pair} onClick={() => { setSelectedPair(pair); setSignal(null); setMessage(null); setError(null); }}
              style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedPair === pair ? "none" : "1px solid rgba(255,255,255,0.1)", background: selectedPair === pair ? "#f59e0b" : "rgba(255,255,255,0.08)", color: selectedPair === pair ? "black" : "#d1d5db" }}>
              {pair}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setSelectedTF(tf)}
              style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedTF === tf ? "none" : "1px solid rgba(255,255,255,0.1)", background: selectedTF === tf ? "#f59e0b" : "rgba(255,255,255,0.08)", color: selectedTF === tf ? "black" : "#d1d5db" }}>
              {tf}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {RR_OPTIONS.map(rr => (
            <button key={rr} onClick={() => setSelectedRR(rr)}
              style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedRR === rr ? "none" : "1px solid rgba(255,255,255,0.1)", background: selectedRR === rr ? "#f59e0b" : "rgba(255,255,255,0.08)", color: selectedRR === rr ? "black" : "#d1d5db" }}>
              {rr}
            </button>
          ))}
        </div>
        <button onClick={analyse} disabled={loading}
          style={{ width: "100%", background: loading ? "rgba(245,158,11,0.5)" : "#f59e0b", color: "black", fontWeight: "bold", padding: "10px", borderRadius: 10, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", border: "none" }}>
          {loading ? "Analysing..." : `⚡ Analyse ${selectedPair}`}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, margin: "10px 12px 0", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 4 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: activeTab === tab ? "#f59e0b" : "transparent", color: activeTab === tab ? "black" : "#9ca3af" }}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 20px" }}>

        {/* SIGNAL TAB */}
        {activeTab === "signal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {message && (
              <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 12, padding: 12, color: "#93c5fd", fontSize: 12 }}>
                📊 {message}
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: 12, color: "#fca5a5", fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}

            {!signal && !message && !error && (
              <div style={{ background: "rgba(17,17,24,0.9)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", padding: 40, textAlign: "center" }}>
                <p style={{ fontSize: 40, marginBottom: 10 }}>⏳</p>
                <p style={{ color: "white", fontWeight: 600 }}>No signal yet</p>
                <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Press Analyse to get a signal</p>
              </div>
            )}

            {/* Limit Orders */}
            {signal?.limitOrders && (
              <div style={{ background: "rgba(17,17,24,0.9)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>📍 Limit Orders</span>
                  <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: "bold" }}>{signal.limitOrders.currentPrice}</span>
                </div>
                {signal.limitOrders.buyLimit && (
                  <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(34,197,94,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "#4ade80", fontWeight: "bold", fontSize: 13 }}>🟢 BUY LIMIT</span>
                      <span style={{ color: "#6b7280", fontSize: 11 }}>{signal.limitOrders.buyLimit.source}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {[
                        { label: "ENTRY", value: signal.limitOrders.buyLimit.price, color: "#f59e0b" },
                        { label: "TP1/2/3", value: `${signal.limitOrders.buyLimit.tp1} / ${signal.limitOrders.buyLimit.tp2} / ${signal.limitOrders.buyLimit.tp3}`, color: "#4ade80", small: true },
                        { label: "SL", value: signal.limitOrders.buyLimit.sl, color: "#f87171" },
                      ].map((item, i) => (
                        <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, textAlign: "center" }}>
                          <p style={{ color: "#6b7280", fontSize: 9, marginBottom: 3 }}>{item.label}</p>
                          <p style={{ color: item.color, fontWeight: "bold", fontSize: item.small ? 9 : 12 }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {signal.limitOrders.sellLimit && (
                  <div style={{ padding: 12, background: "rgba(239,68,68,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "#f87171", fontWeight: "bold", fontSize: 13 }}>🔴 SELL LIMIT</span>
                      <span style={{ color: "#6b7280", fontSize: 11 }}>{signal.limitOrders.sellLimit.source}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {[
                        { label: "ENTRY", value: signal.limitOrders.sellLimit.price, color: "#f59e0b" },
                        { label: "TP1/2/3", value: `${signal.limitOrders.sellLimit.tp1} / ${signal.limitOrders.sellLimit.tp2} / ${signal.limitOrders.sellLimit.tp3}`, color: "#4ade80", small: true },
                        { label: "SL", value: signal.limitOrders.sellLimit.sl, color: "#f87171" },
                      ].map((item, i) => (
                        <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, textAlign: "center" }}>
                          <p style={{ color: "#6b7280", fontSize: 9, marginBottom: 3 }}>{item.label}</p>
                          <p style={{ color: item.color, fontWeight: "bold", fontSize: item.small ? 9 : 12 }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full Signal Card */}
            {signal && !signal.limitOrders && (
              <div style={{ background: "rgba(17,17,24,0.9)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>

                {/* Signal Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div>
                    <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 2 }}>SMC • {signal.timeframe}</p>
                    <p style={{ fontWeight: "bold", fontSize: 18 }}>{signal.pair}</p>
                    {signal.chartPattern && <p style={{ color: "#a78bfa", fontSize: 10, marginTop: 2 }}>📐 {signal.chartPattern}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>Conf: <strong style={{ color: "white" }}>{signal.confidence}%</strong></span>
                    <span style={{ padding: "5px 14px", borderRadius: 8, fontWeight: "bold", fontSize: 13, background: signal.direction === "BUY" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: signal.direction === "BUY" ? "#4ade80" : "#f87171", border: signal.direction === "BUY" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(239,68,68,0.4)" }}>
                      {signal.direction}
                    </span>
                    {signal.exhaustion && <span style={{ fontSize: 9, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 4 }}>⚠️ EXHAUSTION</span>}
                  </div>
                </div>

                {/* Entry / SL */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ padding: 12, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 4 }}>Entry</p>
                    <p style={{ color: "#f59e0b", fontWeight: "bold", fontSize: 16 }}>{signal.entry}</p>
                  </div>
                  <div style={{ padding: 12, textAlign: "center" }}>
                    <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 4 }}>Stop Loss</p>
                    <p style={{ color: "#f87171", fontWeight: "bold", fontSize: 16 }}>{signal.stopLoss}</p>
                  </div>
                </div>

                {/* 3 TPs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: "TP1 (1.5R)", value: signal.tp1, color: "#4ade80" },
                    { label: "TP2 (3R)", value: signal.tp2, color: "#86efac" },
                    { label: "TP3 (5R)", value: signal.tp3, color: "#bbf7d0" },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 10, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <p style={{ color: "#6b7280", fontSize: 9, marginBottom: 3 }}>{item.label}</p>
                      <p style={{ color: item.color, fontWeight: "bold", fontSize: 12 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Trailing Stop */}
                <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(245,158,11,0.05)" }}>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>🔄 Trailing Stop</span>
                  <span style={{ color: "#fcd34d", fontWeight: "bold", fontSize: 12 }}>{signal.trailingStop}</span>
                </div>

                {/* Indicators */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: `${signal.htf} Bias`, value: signal.trend, color: signal.trend?.includes("Bullish") ? "#4ade80" : "#f87171" },
                    { label: "R:R", value: signal.rr, color: "#f59e0b" },
                    { label: `${signal.htf} RSI`, value: signal.htfRSI, color: "white" },
                    { label: `${signal.ltf} RSI`, value: signal.ltfRSI, color: "white" },
                    { label: "Market State", value: signal.marketState || "N/A", color: signal.marketState === "BREAKOUT" ? "#fb923c" : signal.marketState === "TREND" ? "#60a5fa" : "#9ca3af" },
                    { label: "EMA Ribbon", value: signal.emaAligned ? (signal.emaConfirmed ? "✓ Aligned" : "✗ Against") : "Neutral", color: signal.emaAligned && signal.emaConfirmed ? "#4ade80" : "#f87171" },
                    { label: "Structure", value: signal.structureLabels || "N/A", color: "#c4b5fd" },
                    { label: "Dominant", value: signal.dominantTrend || "N/A", color: signal.dominantTrend === "Bullish" ? "#4ade80" : signal.dominantTrend === "Bearish" ? "#f87171" : "#9ca3af" },
                    { label: "Chart Pattern", value: signal.chartPattern || "None", color: "#67e8f9" },
                    { label: "Exhaustion", value: signal.exhaustion ? "⚠️ YES" : "✓ No", color: signal.exhaustion ? "#f87171" : "#4ade80" },
                    { label: "Wick Cluster", value: signal.wickCluster || "None", color: signal.wickCluster ? "#f9a8d4" : "#6b7280" },
                    { label: "Range Zone", value: signal.range ? `${signal.range.position} ${signal.range.pct}%` : "N/A", color: signal.range?.position === "Premium" ? "#f87171" : "#4ade80" },
                  ].map((item, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>{item.label}</p>
                      <p style={{ color: item.color, fontSize: 11, fontWeight: 500 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Entry Signals */}
                <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Entry Signals</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {signal.reasons?.split(", ").map((reason, i) => (
                      <span key={i} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }}>{reason}</span>
                    ))}
                  </div>
                </div>

                {/* Extra Confluence */}
                <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Extra Confluence</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {signal.dominantTrend && signal.dominantTrend !== "Neutral" && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)" }}>Dominant: {signal.dominantTrend}</span>}
                    {signal.mss && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(168,85,247,0.1)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,0.3)" }}>{signal.mss}</span>}
                    {signal.idm && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>{signal.idm}</span>}
                    {signal.breaker && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(236,72,153,0.1)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.3)" }}>{signal.breaker}</span>}
                    {signal.sss && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }}>{signal.sss}</span>}
                    {signal.trendlineSweep && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}>{signal.trendlineSweep}</span>}
                    {signal.chartPattern && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>📐 {signal.chartPattern}</span>}
                    {signal.wickCluster && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(244,114,182,0.1)", color: "#f9a8d4", border: "1px solid rgba(244,114,182,0.3)" }}>{signal.wickCluster}</span>}
                    {signal.supplyDemand && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(249,115,22,0.1)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.3)" }}>{signal.supplyDemand}</span>}
                    {signal.equalLevels && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>{signal.equalLevels}</span>}
                    {!signal.mss && !signal.idm && !signal.breaker && !signal.sss && !signal.trendlineSweep && !signal.chartPattern && !signal.wickCluster && !signal.supplyDemand && !signal.equalLevels && (
                      <span style={{ color: "#6b7280", fontSize: 11 }}>None detected</span>
                    )}
                  </div>
                </div>

                {/* Orderflow */}
                {signal.orderflow && (
                  <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 8 }}>Orderflow (CVD)</p>
                    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ background: "#22c55e", width: `${signal.orderflow.buyPct}%` }} />
                      <div style={{ background: "#ef4444", width: `${signal.orderflow.sellPct}%` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#4ade80" }}>Buy: {signal.orderflow.buyPct}%</span>
                      <span style={{ color: signal.orderflow.trend === "positive" ? "#4ade80" : "#f87171" }}>{signal.orderflow.trend === "positive" ? "▲" : "▼"} {signal.orderflow.cvd} CVD</span>
                      <span style={{ color: "#f87171" }}>Sell: {signal.orderflow.sellPct}%</span>
                    </div>
                  </div>
                )}

                {/* Analysis */}
                <div style={{ padding: 12 }}>
                  <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>⚡ AI Analysis</p>
                  <p style={{ color: "#e5e7eb", fontSize: 12, lineHeight: 1.6 }}>{signal.analysis}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHART TAB */}
        {activeTab === "chart" && (
          <div style={{ height: "70vh" }}>
            <Chart signal={signal} interval={selectedTF} />
          </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === "tools" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PositionSize signal={signal} />
            <SignalHistory />
          </div>
        )}

        {/* MARKET TAB */}
        {activeTab === "market" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <NewsFilter />
            <MultiTimeframe pair={selectedPair} />
            <Sentiment pair={selectedPair} />
          </div>
        )}

      </div>
    </div>
  );
}