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
  if (utcTime >= 0 && utcTime < 7) { session = "Asian"; sessionColor = "text-purple-400"; }
  else if (utcTime >= 7 && utcTime < 13) { session = "London"; sessionColor = "text-blue-400"; }
  else if (utcTime >= 13 && utcTime < 22) { session = "New York"; sessionColor = "text-orange-400"; }
  else { session = "Off Hours"; sessionColor = "text-gray-500"; }
  if (utcTime >= 0 && utcTime < 3) { killzone = "Asian KZ"; killzoneColor = "text-purple-300"; }
  else if (utcTime >= 7 && utcTime < 9) { killzone = "London Open KZ"; killzoneColor = "text-blue-300"; }
  else if (utcTime >= 12 && utcTime < 13.5) { killzone = "NY Open KZ"; killzoneColor = "text-orange-300"; }
  else if (utcTime >= 15 && utcTime < 16) { killzone = "London Close KZ"; killzoneColor = "text-pink-300"; }
  return { session, sessionColor, killzone, killzoneColor };
}

function CandlestickBackground() {
  const candles = Array.from({ length: 40 }, (_, i) => ({
    i, isUp: Math.random() > 0.5,
    bodyH: 40 + Math.random() * 100,
    totalH: 80 + Math.random() * 120,
    yPos: 5 + Math.random() * 60,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 8,
    opacity: 0.15 + Math.random() * 0.25,
    x: (i / 40) * 105,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)", filter: "blur(40px)", animation: "pulse 6s ease-in-out infinite" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)", filter: "blur(40px)", animation: "pulse 8s ease-in-out 2s infinite" }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)", filter: "blur(40px)", animation: "pulse 7s ease-in-out 1s infinite" }} />
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {candles.map((c) => (
          <g key={c.i} style={{ opacity: c.opacity }}>
            <style>{`@keyframes candle-${c.i}{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}`}</style>
            <g style={{ animation: `candle-${c.i} ${c.duration}s ease-in-out ${c.delay}s infinite` }}>
              <line x1={`${c.x}%`} y1={`${c.yPos}%`} x2={`${c.x}%`} y2={`${c.yPos + c.totalH / 6}%`}
                stroke={c.isUp ? "#22c55e" : "#ef4444"} strokeWidth="2" filter="url(#glow)" />
              <rect x={`calc(${c.x}% - 6px)`} y={`${c.yPos + 8}%`} width="12" height={`${c.bodyH / 10}%`}
                fill={c.isUp ? "#22c55e" : "#ef4444"} rx="2" filter="url(#glow)" />
            </g>
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/30 to-[#0a0a0f]/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />
    </div>
  );
}

const Tag = ({ text, color }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs border ${color}`}>{text}</span>
);

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
      const res = await fetch(`https://gold-web.onrender.com/smc/${rrParam}?pair=${pairParam}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.message) setMessage(data.message);
      else {
        setSignal(data);
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

  const tickerItems = [
    { text: `XAU/USD  ${prices["XAU/USD"] ? `$${prices["XAU/USD"]}` : "..."}`, color: "text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(234,179,8,1)]" },
    { text: `BTC/USD  ${prices["BTC/USD"] ? `$${prices["BTC/USD"]}` : "..."}`, color: "text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(251,146,60,1)]" },
    { text: `Session: ${sessionInfo.session}`, color: sessionInfo.sessionColor + " font-semibold" },
    { text: sessionInfo.killzone ? `🎯 ${sessionInfo.killzone} ACTIVE` : "No Killzone", color: sessionInfo.killzone ? sessionInfo.killzoneColor + " font-bold" : "text-gray-500" },
    { text: `Strategy: SMC + Price Action`, color: "text-blue-400" },
    { text: `HTF: 15m  •  LTF: 5m`, color: "text-purple-400" },
    { text: `MSS  •  IDM  •  OB  •  BB  •  FVG  •  Liquidity  •  Supply/Demand`, color: "text-gray-300" },
  ];

  const allTickers = [...tickerItems, ...tickerItems, ...tickerItems];
  const currentPrice = prices[selectedPair];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "white", fontFamily: "sans-serif", position: "relative" }}>
      <CandlestickBackground />

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(10,10,15,0.7)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 32, height: 32, background: "#f59e0b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "black", boxShadow: "0 0 20px rgba(234,179,8,0.9)" }}>G</div>
            <span style={{ fontWeight: "bold", fontSize: 18 }}>GoldSignal</span>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{time.toUTCString()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentPrice && <span style={{ color: "#f59e0b", fontWeight: "bold", fontSize: 14 }}>{selectedPair} ${currentPrice}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", animation: "pulse 2s infinite" }}></div>
              <span style={{ color: "#22c55e", fontSize: 14 }}>Live</span>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div style={{ background: "rgba(13,13,20,0.8)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "6px 0", overflow: "hidden", flexShrink: 0 }}>
          <style>{`
            @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-33.33%)}}
            .ticker-track{display:flex;width:max-content;animation:ticker 50s linear infinite}
            .ticker-track:hover{animation-play-state:paused}
          `}</style>
          <div className="ticker-track">
            {allTickers.map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center" }}>
                <span className={item.color} style={{ fontSize: 12, padding: "0 20px", whiteSpace: "nowrap" }}>{item.text}</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
              </span>
            ))}
          </div>
        </div>

        {/* Killzone Banner */}
        {sessionInfo.killzone && (
          <div style={{ margin: "8px 16px 0", borderRadius: 12, border: "1px solid rgba(249,115,22,0.4)", background: "rgba(249,115,22,0.1)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ color: "#fb923c" }}>🎯</span>
            <span style={{ color: "#fdba74", fontWeight: 600, fontSize: 12 }}>{sessionInfo.killzone} is ACTIVE — High probability zone</span>
            <span className={sessionInfo.sessionColor} style={{ marginLeft: "auto", fontSize: 12 }}>{sessionInfo.session} Session</span>
          </div>
        )}

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, overflow: "auto", padding: "12px", gap: "12px" }}>

          {/* LEFT PANEL - scrollable */}
          <div style={{
            width: "320px",
            flexShrink: 0,
            height: "100%",
            overflowY: "auto",
WebkitOverflowScrolling: "touch",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.15) transparent",
            paddingRight: "4px",
          }}>

            {/* Controls */}
            <div style={{ background: "rgba(17,17,24,0.9)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
              <p style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pair</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {PAIRS.map(pair => (
                  <button key={pair} onClick={() => { setSelectedPair(pair); setSignal(null); setMessage(null); setError(null); }}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedPair === pair ? "none" : "1px solid rgba(255,255,255,0.1)", background: selectedPair === pair ? "#f59e0b" : "rgba(255,255,255,0.08)", color: selectedPair === pair ? "black" : "#d1d5db", boxShadow: selectedPair === pair ? "0 0 12px rgba(234,179,8,0.7)" : "none" }}>
                    {pair}
                  </button>
                ))}
              </div>

              <p style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Timeframe</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {TIMEFRAMES.map(tf => (
                  <button key={tf} onClick={() => setSelectedTF(tf)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedTF === tf ? "none" : "1px solid rgba(255,255,255,0.1)", background: selectedTF === tf ? "#f59e0b" : "rgba(255,255,255,0.08)", color: selectedTF === tf ? "black" : "#d1d5db", boxShadow: selectedTF === tf ? "0 0 12px rgba(234,179,8,0.7)" : "none" }}>
                    {tf}
                  </button>
                ))}
              </div>

              <p style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Risk : Reward</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {RR_OPTIONS.map(rr => (
                  <button key={rr} onClick={() => setSelectedRR(rr)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedRR === rr ? "none" : "1px solid rgba(255,255,255,0.1)", background: selectedRR === rr ? "#f59e0b" : "rgba(255,255,255,0.08)", color: selectedRR === rr ? "black" : "#d1d5db", boxShadow: selectedRR === rr ? "0 0 12px rgba(234,179,8,0.7)" : "none" }}>
                    {rr}
                  </button>
                ))}
              </div>

              <button onClick={analyse} disabled={loading}
                style={{ width: "100%", background: loading ? "rgba(245,158,11,0.5)" : "#f59e0b", color: "black", fontWeight: "bold", padding: "10px", borderRadius: 12, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", border: "none", boxShadow: "0 0 25px rgba(234,179,8,0.5)" }}>
                {loading ? "Analysing..." : `⚡ Analyse ${selectedPair}`}
              </button>
            </div>

            <NewsFilter />
            <MultiTimeframe pair={selectedPair} />
            <Sentiment pair={selectedPair} />

            {message && (
              <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 16, padding: 12, color: "#93c5fd", fontSize: 12 }}>
                📊 {message}
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 16, padding: 12, color: "#fca5a5", fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}

            {signal && (
              <div style={{ background: "rgba(17,17,24,0.9)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div>
                    <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 2 }}>SMC • {signal.timeframe}</p>
                    <p style={{ fontWeight: "bold", fontSize: 16 }}>{signal.pair}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>Conf: <strong style={{ color: "white" }}>{signal.confidence}%</strong></span>
                    <span style={{ padding: "4px 12px", borderRadius: 8, fontWeight: "bold", fontSize: 12, background: signal.direction === "BUY" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: signal.direction === "BUY" ? "#4ade80" : "#f87171", border: signal.direction === "BUY" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(239,68,68,0.4)", boxShadow: signal.direction === "BUY" ? "0 0 12px rgba(74,222,128,0.5)" : "0 0 12px rgba(248,113,113,0.5)" }}>
                      {signal.direction}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: "Entry", value: signal.entry, color: "#f59e0b" },
                    { label: "TP", value: signal.takeProfit, color: "#4ade80" },
                    { label: "SL", value: signal.stopLoss, color: "#f87171" },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 12, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 4 }}>{item.label}</p>
                      <p style={{ color: item.color, fontWeight: "bold", fontSize: 13 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: "15m Bias", value: signal.trend, color: signal.trend?.includes("Bullish") ? "#4ade80" : "#f87171" },
                    { label: "R:R", value: signal.rr, color: "#f59e0b" },
                    { label: "15m RSI", value: signal.htfRSI, color: "white" },
                    { label: "5m RSI", value: signal.ltfRSI, color: "white" },
                    { label: "EMA 50", value: signal.ema50 || "N/A", color: "white" },
                    { label: "EMA OK", value: signal.emaConfirmed ? "✓ Yes" : "✗ No", color: signal.emaConfirmed ? "#4ade80" : "#f87171" },
                  ].map((item, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 2 }}>{item.label}</p>
                      <p style={{ color: item.color, fontSize: 11, fontWeight: 500 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Entry Signals</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {signal.reasons?.split(", ").map((reason, i) => (
                      <span key={i} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }}>{reason}</span>
                    ))}
                  </div>
                </div>

                <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>Extra Confluence</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {signal.mss && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(168,85,247,0.1)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,0.3)" }}>{signal.mss}</span>}
                    {signal.idm && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>{signal.idm}</span>}
                    {signal.breaker && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(236,72,153,0.1)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.3)" }}>{signal.breaker}</span>}
                    {signal.supplyDemand && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(249,115,22,0.1)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.3)" }}>{signal.supplyDemand}</span>}
                    {signal.equalLevels && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>{signal.equalLevels}</span>}
                    {!signal.mss && !signal.idm && !signal.breaker && !signal.supplyDemand && !signal.equalLevels && (
                      <span style={{ color: "#6b7280", fontSize: 11 }}>None detected</span>
                    )}
                  </div>
                </div>

                {signal.orderflow && (
                  <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 8 }}>Orderflow (CVD)</p>
                    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ background: "#22c55e", width: `${signal.orderflow.buyPct}%` }} />
                      <div style={{ background: "#ef4444", width: `${signal.orderflow.sellPct}%` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#4ade80" }}>Buy: {signal.orderflow.buyPct}%</span>
                      <span style={{ color: signal.orderflow.trend === "positive" ? "#4ade80" : "#f87171" }}>
                        {signal.orderflow.trend === "positive" ? "▲" : "▼"} {signal.orderflow.cvd} CVD
                      </span>
                      <span style={{ color: "#f87171" }}>Sell: {signal.orderflow.sellPct}%</span>
                    </div>
                  </div>
                )}

                <div style={{ padding: 12 }}>
                  <p style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>⚡ AI Analysis</p>
                  <p style={{ color: "#e5e7eb", fontSize: 11, lineHeight: 1.6 }}>{signal.analysis}</p>
                </div>
              </div>
            )}

            <PositionSize signal={signal} />
            <SignalHistory />

          </div>

          {/* RIGHT — Chart */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Chart signal={signal} interval={selectedTF} />
          </div>

        </div>
      </div>
    </div>
  );
}