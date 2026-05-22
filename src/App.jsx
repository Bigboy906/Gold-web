import { useState, useEffect } from "react";

const TIMEFRAMES = ["5m", "15m", "30m", "1H", "4H"];
const RR_OPTIONS = ["1:1.5", "1:2", "1:3", "1:3.5"];

function getSessionInfo() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcTime = utcHour + utcMin / 60;

  let session, killzone, sessionColor, killzoneColor;

  if (utcTime >= 0 && utcTime < 7) {
    session = "Asian"; sessionColor = "text-purple-400";
  } else if (utcTime >= 7 && utcTime < 13) {
    session = "London"; sessionColor = "text-blue-400";
  } else if (utcTime >= 13 && utcTime < 22) {
    session = "New York"; sessionColor = "text-orange-400";
  } else {
    session = "Off Hours"; sessionColor = "text-gray-500";
  }

  if (utcTime >= 0 && utcTime < 3) {
    killzone = "Asian KZ"; killzoneColor = "text-purple-300";
  } else if (utcTime >= 7 && utcTime < 9) {
    killzone = "London Open KZ"; killzoneColor = "text-blue-300";
  } else if (utcTime >= 12 && utcTime < 13.5) {
    killzone = "NY Open KZ"; killzoneColor = "text-orange-300";
  } else if (utcTime >= 15 && utcTime < 16) {
    killzone = "London Close KZ"; killzoneColor = "text-pink-300";
  }

  return { session, sessionColor, killzone, killzoneColor };
}

function CandlestickBackground() {
  const candles = Array.from({ length: 40 }, (_, i) => {
    const isUp = Math.random() > 0.5;
    const bodyH = 40 + Math.random() * 100;
    const totalH = bodyH + 20 + Math.random() * 60;
    const yPos = 10 + Math.random() * 70;
    const duration = 8 + Math.random() * 10;
    const delay = Math.random() * 10;
    const opacity = 0.03 + Math.random() * 0.07;
    return { i, isUp, bodyH, totalH, yPos, duration, delay, opacity, x: (i / 40) * 105 };
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)", filter: "blur(60px)", animation: "pulse 6s ease-in-out infinite" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", filter: "blur(60px)", animation: "pulse 8s ease-in-out 2s infinite" }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full opacity-4"
        style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)", filter: "blur(50px)", animation: "pulse 7s ease-in-out 1s infinite" }} />

      {/* Candles */}
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {candles.map((c) => (
          <g key={c.i} style={{ opacity: c.opacity }}>
            <style>{`
              @keyframes candle-${c.i} {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-${15 + Math.random() * 20}px); }
              }
            `}</style>
            <g style={{ animation: `candle-${c.i} ${c.duration}s ease-in-out ${c.delay}s infinite` }}>
              <line
                x1={`${c.x}%`} y1={`${c.yPos}%`}
                x2={`${c.x}%`} y2={`${c.yPos + c.totalH / 8}%`}
                stroke={c.isUp ? "#22c55e" : "#ef4444"}
                strokeWidth="1.5"
                filter="url(#glow)"
              />
              <rect
                x={`calc(${c.x}% - 5px)`}
                y={`${c.yPos + 5}%`}
                width="10"
                height={`${c.bodyH / 12}%`}
                fill={c.isUp ? "#22c55e" : "#ef4444"}
                rx="1.5"
                filter="url(#glow)"
              />
            </g>
          </g>
        ))}
      </svg>

      {/* Dark overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/90 via-[#0a0a0f]/50 to-[#0a0a0f]/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-transparent to-[#0a0a0f]/80" />
    </div>
  );
}

function TradingViewChart({ interval }) {
  const intervalMap = { "5m": "5", "15m": "15", "30m": "30", "1H": "60", "4H": "240" };
  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-white/10">
      <iframe
        key={interval}
        src={`https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=OANDA%3AXAUUSD&interval=${intervalMap[interval] || "15"}&theme=dark&style=1&locale=en&studies=RSI%40tv-basicstudies&hidesidetoolbar=0&hidetoptoolbar=0&withdateranges=1`}
        style={{ width: "100%", height: "100%" }}
        frameBorder="0"
        allowTransparency={true}
        allowFullScreen={true}
      />
    </div>
  );
}

export default function App() {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRR, setSelectedRR] = useState("1:2");
  const [selectedTF, setSelectedTF] = useState("15m");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [changePct, setChangePct] = useState(null);
  const [time, setTime] = useState(new Date());
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());

  useEffect(() => {
    const clock = setInterval(() => { setTime(new Date()); setSessionInfo(getSessionInfo()); }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("https://gold-web.onrender.com/price");
        const data = await res.json();
        if (data.price) {
          const newPrice = parseFloat(data.price);
          setPrice(prev => {
            if (prev) {
              const diff = newPrice - parseFloat(prev);
              const pct = (diff / parseFloat(prev)) * 100;
              setChange(diff.toFixed(2));
              setChangePct(pct.toFixed(2));
            }
            return newPrice.toFixed(2);
          });
        }
      } catch (err) {}
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, []);

  const analyse = async () => {
    setLoading(true);
    setError(null);
    setSignal(null);
    setMessage(null);
    try {
      const rrParam = selectedRR.replace(":", "%3A");
      const res = await fetch(`https://gold-web.onrender.com/smc/${rrParam}`);
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

  const isUp = parseFloat(change) >= 0;

  const tickerItems = [
    { text: `XAU/USD  ${price ? `$${price}` : "..."}`, color: "text-yellow-400 font-bold drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]" },
    { text: `${change ? (isUp ? "▲" : "▼") + " " + Math.abs(change) : "—"}  ${changePct ? `(${isUp ? "+" : ""}${changePct}%)` : ""}`, color: isUp ? "text-green-400" : "text-red-400" },
    { text: `Session: ${sessionInfo.session}`, color: sessionInfo.sessionColor + " font-semibold" },
    { text: sessionInfo.killzone ? `🎯 ${sessionInfo.killzone} ACTIVE` : "No Killzone", color: sessionInfo.killzone ? sessionInfo.killzoneColor + " font-bold" : "text-gray-600" },
    { text: `Strategy: SMC + Price Action`, color: "text-blue-400" },
    { text: `HTF: 15m  •  LTF: 5m`, color: "text-purple-400" },
    { text: `OB  •  Liquidity  •  Engulfing  •  FVG  •  RSI  •  EMA`, color: "text-gray-400" },
  ];

  const allTickers = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans relative">
      <CandlestickBackground />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 backdrop-blur-md bg-[#0a0a0f]/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.7)]">G</div>
            <span className="font-bold text-lg tracking-wide">GoldSignal</span>
          </div>
          <div className="text-xs text-gray-400 hidden md:block">{time.toUTCString()}</div>
          <div className="flex items-center gap-4">
            {price && (
              <span className="text-yellow-400 font-bold text-sm drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]">
                ${price} <span className={isUp ? "text-green-400 text-xs" : "text-red-400 text-xs"}>{change ? `${isUp ? "+" : ""}${change}` : ""}</span>
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">Live</span>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="bg-[#0d0d14]/80 border-b border-white/10 py-1.5 overflow-hidden backdrop-blur-sm shrink-0">
          <style>{`
            @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
            .ticker-track { display: flex; width: max-content; animation: ticker 45s linear infinite; }
            .ticker-track:hover { animation-play-state: paused; }
          `}</style>
          <div className="ticker-track">
            {allTickers.map((item, i) => (
              <span key={i} className="flex items-center">
                <span className={`text-xs px-5 whitespace-nowrap ${item.color}`}>{item.text}</span>
                <span className="text-white/20">•</span>
              </span>
            ))}
          </div>
        </div>

        {/* Killzone Banner */}
        {sessionInfo.killzone && (
          <div className="mx-4 mt-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 flex items-center gap-3 backdrop-blur-sm shrink-0">
            <span className="text-orange-400 animate-pulse">🎯</span>
            <span className="text-orange-300 font-semibold text-xs">{sessionInfo.killzone} is ACTIVE — High probability zone</span>
            <span className={`ml-auto text-xs font-medium ${sessionInfo.sessionColor}`}>{sessionInfo.session} Session</span>
          </div>
        )}

        {/* Main Layout — Left + Right */}
        <div className="flex flex-1 gap-4 p-4 overflow-hidden">

          {/* LEFT — Controls + Signal */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">

            {/* Controls */}
            <div className="bg-[#111118]/90 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Timeframe</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {TIMEFRAMES.map(tf => (
                  <button key={tf} onClick={() => setSelectedTF(tf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedTF === tf
                        ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}>{tf}</button>
                ))}
              </div>

              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Risk : Reward</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {RR_OPTIONS.map(rr => (
                  <button key={rr} onClick={() => setSelectedRR(rr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedRR === rr
                        ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}>{rr}</button>
                ))}
              </div>

              <button onClick={analyse} disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                {loading ? "Analysing..." : "⚡ Analyse Chart"}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-blue-300 text-xs backdrop-blur-sm">
                📊 {message}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-red-400 text-xs backdrop-blur-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Signal Card */}
            {signal && (
              <div className="bg-[#111118]/90 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">SMC • {signal.timeframe}</p>
                    <p className="text-base font-bold">{signal.pair}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">Conf: <span className="text-white font-bold">{signal.confidence}%</span></span>
                    <span className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      signal.direction === "BUY"
                        ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.4)]"
                        : "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.4)]"
                    }`}>{signal.direction}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/10">
                  <div className="bg-[#111118] p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Entry</p>
                    <p className="text-yellow-400 font-bold drop-shadow-[0_0_6px_rgba(234,179,8,0.8)] text-sm">{signal.entry}</p>
                  </div>
                  <div className="bg-[#111118] p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">TP</p>
                    <p className="text-green-400 font-bold drop-shadow-[0_0_6px_rgba(74,222,128,0.8)] text-sm">{signal.takeProfit}</p>
                  </div>
                  <div className="bg-[#111118] p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">SL</p>
                    <p className="text-red-400 font-bold drop-shadow-[0_0_6px_rgba(248,113,113,0.8)] text-sm">{signal.stopLoss}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/10">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-gray-500 text-xs mb-0.5">15m Bias</p>
                    <p className={`text-xs font-medium ${signal.trend?.includes("Bullish") ? "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]" : "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]"}`}>{signal.trend}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-gray-500 text-xs mb-0.5">R:R</p>
                    <p className="text-yellow-400 text-xs font-medium">{signal.rr}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-gray-500 text-xs mb-0.5">15m RSI</p>
                    <p className="text-white text-xs font-medium">{signal.htfRSI}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-gray-500 text-xs mb-0.5">5m RSI</p>
                    <p className="text-white text-xs font-medium">{signal.ltfRSI}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-gray-500 text-xs mb-0.5">EMA 50</p>
                    <p className="text-white text-xs font-medium">{signal.ema50 || "N/A"}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-gray-500 text-xs mb-0.5">EMA OK</p>
                    <p className={`text-xs font-medium ${signal.emaConfirmed ? "text-green-400" : "text-red-400"}`}>{signal.emaConfirmed ? "✓ Yes" : "✗ No"}</p>
                  </div>
                </div>

                <div className="p-3 border-b border-white/10">
                  <p className="text-gray-500 text-xs mb-1.5">Entry Reasons</p>
                  <div className="flex flex-wrap gap-1">
                    {signal.reasons?.split(", ").map((reason, i) => (
                      <span key={i} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-xs">{reason}</span>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-gray-500 text-xs mb-1.5">⚡ AI Analysis</p>
                  <p className="text-gray-300 text-xs leading-relaxed">{signal.analysis}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Chart */}
          <div className="flex-1 min-w-0">
            <TradingViewChart interval={selectedTF} />
          </div>

        </div>
      </div>
    </div>
  );
}