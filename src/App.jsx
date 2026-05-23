import { useState, useEffect } from "react";
import Chart from "./Chart";

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
      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* Glowing orbs — more visible */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)", filter: "blur(40px)", animation: "pulse 6s ease-in-out infinite" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)", filter: "blur(40px)", animation: "pulse 8s ease-in-out 2s infinite" }} />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)", filter: "blur(40px)", animation: "pulse 7s ease-in-out 1s infinite" }} />

      {/* Candles — more visible */}
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {candles.map((c) => (
          <g key={c.i} style={{ opacity: c.opacity }}>
            <style>{`
              @keyframes candle-${c.i} {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-${20 + Math.random() * 30}px); }
              }
            `}</style>
            <g style={{ animation: `candle-${c.i} ${c.duration}s ease-in-out ${c.delay}s infinite` }}>
              <line
                x1={`${c.x}%`} y1={`${c.yPos}%`}
                x2={`${c.x}%`} y2={`${c.yPos + c.totalH / 6}%`}
                stroke={c.isUp ? "#22c55e" : "#ef4444"}
                strokeWidth="2"
                filter="url(#glow)"
              />
              <rect
                x={`calc(${c.x}% - 6px)`}
                y={`${c.yPos + 8}%`}
                width="12"
                height={`${c.bodyH / 10}%`}
                fill={c.isUp ? "#22c55e" : "#ef4444"}
                rx="2"
                filter="url(#glow)"
              />
            </g>
          </g>
        ))}
      </svg>

      {/* Lighter overlays so candles show through */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/30 to-[#0a0a0f]/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />
    </div>
  );
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
      else setSignal(data);
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
    { text: `OB  •  Liquidity  •  Engulfing  •  FVG  •  RSI  •  EMA`, color: "text-gray-300" },
  ];

  const allTickers = [...tickerItems, ...tickerItems, ...tickerItems];
  const currentPrice = prices[selectedPair];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans relative">
      <CandlestickBackground />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 backdrop-blur-md bg-[#0a0a0f]/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-bold shadow-[0_0_20px_rgba(234,179,8,0.9)]">G</div>
            <span className="font-bold text-lg tracking-wide">GoldSignal</span>
          </div>
          <div className="text-xs text-gray-300 hidden md:block">{time.toUTCString()}</div>
          <div className="flex items-center gap-4">
            {currentPrice && (
              <span className="text-yellow-400 font-bold text-sm drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]">
                {selectedPair} ${currentPrice}
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]"></div>
              <span className="text-green-400 text-sm">Live</span>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="bg-[#0d0d14]/70 border-b border-white/10 py-1.5 overflow-hidden backdrop-blur-sm shrink-0">
          <style>{`
            @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
            .ticker-track { display: flex; width: max-content; animation: ticker 45s linear infinite; }
            .ticker-track:hover { animation-play-state: paused; }
          `}</style>
          <div className="ticker-track">
            {allTickers.map((item, i) => (
              <span key={i} className="flex items-center">
                <span className={`text-xs px-5 whitespace-nowrap ${item.color}`}>{item.text}</span>
                <span className="text-white/30">•</span>
              </span>
            ))}
          </div>
        </div>

        {/* Killzone Banner */}
        {sessionInfo.killzone && (
          <div className="mx-4 mt-2 rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-1.5 flex items-center gap-3 backdrop-blur-sm shrink-0">
            <span className="text-orange-400 animate-pulse">🎯</span>
            <span className="text-orange-300 font-semibold text-xs">{sessionInfo.killzone} is ACTIVE — High probability zone</span>
            <span className={`ml-auto text-xs font-medium ${sessionInfo.sessionColor}`}>{sessionInfo.session} Session</span>
          </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-1 gap-4 p-4 overflow-hidden">

          {/* LEFT */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-[0_0_30px_rgba(0,0,0,0.5)]">

              {/* Pair */}
              <p className="text-gray-300 text-xs uppercase tracking-wider mb-2 font-semibold">Pair</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {PAIRS.map(pair => (
                  <button key={pair} onClick={() => { setSelectedPair(pair); setSignal(null); setMessage(null); setError(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedPair === pair
                        ? "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.7)]"
                        : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                    }`}>{pair}</button>
                ))}
              </div>

              {/* Timeframe */}
              <p className="text-gray-300 text-xs uppercase tracking-wider mb-2 font-semibold">Timeframe</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {TIMEFRAMES.map(tf => (
                  <button key={tf} onClick={() => setSelectedTF(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedTF === tf
                        ? "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.7)]"
                        : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                    }`}>{tf}</button>
                ))}
              </div>

              {/* RR */}
              <p className="text-gray-300 text-xs uppercase tracking-wider mb-2 font-semibold">Risk : Reward</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {RR_OPTIONS.map(rr => (
                  <button key={rr} onClick={() => setSelectedRR(rr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedRR === rr
                        ? "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.7)]"
                        : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                    }`}>{rr}</button>
                ))}
              </div>

              <button onClick={analyse} disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition-all shadow-[0_0_25px_rgba(234,179,8,0.5)]">
                {loading ? "Analysing..." : `⚡ Analyse ${selectedPair}`}
              </button>
            </div>

            {message && (
              <div className="bg-blue-500/15 border border-blue-500/40 rounded-2xl p-3 text-blue-300 text-xs backdrop-blur-sm">
                📊 {message}
              </div>
            )}

            {error && (
              <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3 text-red-300 text-xs backdrop-blur-sm">
                ⚠️ {error}
              </div>
            )}

            {signal && (
              <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">SMC • {signal.timeframe}</p>
                    <p className="text-base font-bold">{signal.pair}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-300">Conf: <span className="text-white font-bold">{signal.confidence}%</span></span>
                    <span className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      signal.direction === "BUY"
                        ? "bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_12px_rgba(74,222,128,0.5)]"
                        : "bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_12px_rgba(248,113,113,0.5)]"
                    }`}>{signal.direction}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/10">
                  <div className="bg-[#111118]/80 p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Entry</p>
                    <p className="text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(234,179,8,1)] text-sm">{signal.entry}</p>
                  </div>
                  <div className="bg-[#111118]/80 p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">TP</p>
                    <p className="text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,1)] text-sm">{signal.takeProfit}</p>
                  </div>
                  <div className="bg-[#111118]/80 p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">SL</p>
                    <p className="text-red-400 font-bold drop-shadow-[0_0_8px_rgba(248,113,113,1)] text-sm">{signal.stopLoss}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/10">
                  {[
                    { label: "15m Bias", value: signal.trend, color: signal.trend?.includes("Bullish") ? "text-green-400" : "text-red-400" },
                    { label: "R:R", value: signal.rr, color: "text-yellow-400" },
                    { label: "15m RSI", value: signal.htfRSI, color: "text-white" },
                    { label: "5m RSI", value: signal.ltfRSI, color: "text-white" },
                    { label: "EMA 50", value: signal.ema50 || "N/A", color: "text-white" },
                    { label: "EMA OK", value: signal.emaConfirmed ? "✓ Yes" : "✗ No", color: signal.emaConfirmed ? "text-green-400" : "text-red-400" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/8 rounded-lg p-2 border border-white/10">
                      <p className="text-gray-400 text-xs mb-0.5">{item.label}</p>
                      <p className={`text-xs font-medium ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-b border-white/10">
                  <p className="text-gray-400 text-xs mb-1.5">Entry Reasons</p>
                  <div className="flex flex-wrap gap-1">
                    {signal.reasons?.split(", ").map((reason, i) => (
                      <span key={i} className="bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs">{reason}</span>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-gray-400 text-xs mb-1.5">⚡ AI Analysis</p>
                  <p className="text-gray-200 text-xs leading-relaxed">{signal.analysis}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Chart */}
          <div className="flex-1 min-w-0">
            <Chart signal={signal} interval={selectedTF} />
          </div>

        </div>
      </div>
    </div>
  );
}