import { useState } from "react";

const timeframes = ["5m", "15m", "30m", "1H", "4H"];

export default function App() {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTF, setSelectedTF] = useState("1H");
  const [error, setError] = useState(null);

  const analyse = async () => {
    setLoading(true);
    setError(null);
    setSignal(null);
    try {
      const res = await fetch(`https://gold-web.onrender.com/analyse/${selectedTF}`);
      const data = await res.json();
      if (data.error || data.message) {
        setError(data.error || data.message);
      } else {
        setSignal(data);
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">G</div>
          <span className="text-white font-bold text-lg">GoldSignal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm">Live</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">XAUUSD Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">Select a timeframe and press Analyse</p>
        </div>

        {/* Timeframe Selector */}
        <div className="bg-[#111118] rounded-2xl p-5 border border-white/10 mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Timeframe</p>
          <div className="flex gap-2 flex-wrap">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTF(tf)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTF === tf
                    ? "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={analyse}
            disabled={loading}
            className="w-full mt-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)]"
          >
            {loading ? "Analysing..." : "⚡ Analyse Chart"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Signal Card */}
        {signal && (
          <div className="bg-[#111118] rounded-2xl border border-white/10 overflow-hidden">
            {/* Signal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{signal.timeframe} Signal</p>
                <p className="text-xl font-bold">{signal.pair}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Confidence: <span className="text-white font-bold">{signal.confidence}%</span></span>
                <span className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  signal.direction === "BUY"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_12px_rgba(74,222,128,0.4)]"
                    : "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(248,113,113,0.4)]"
                }`}>
                  {signal.direction}
                </span>
              </div>
            </div>

            {/* Price Levels */}
            <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/10">
              <div className="bg-[#111118] p-4 text-center">
                <p className="text-gray-500 text-xs uppercase mb-2">Entry</p>
                <p className="text-yellow-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">{signal.entry}</p>
              </div>
              <div className="bg-[#111118] p-4 text-center">
                <p className="text-gray-500 text-xs uppercase mb-2">Take Profit</p>
                <p className="text-green-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">{signal.takeProfit}</p>
              </div>
              <div className="bg-[#111118] p-4 text-center">
                <p className="text-gray-500 text-xs uppercase mb-2">Stop Loss</p>
                <p className="text-red-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]">{signal.stopLoss}</p>
              </div>
            </div>

            {/* Indicators */}
            <div className="grid grid-cols-3 gap-4 p-5 border-b border-white/10">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">RSI</p>
                <p className="text-white font-medium">{signal.rsi}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">Trend</p>
                <p className={signal.trend === "Bullish"
                  ? "text-green-400 font-medium drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                  : "text-red-400 font-medium drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                }>{signal.trend}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">R:R</p>
                <p className="text-white font-medium">{signal.rr}</p>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="p-5">
              <p className="text-gray-500 text-xs uppercase mb-2">⚡ AI Analysis</p>
              <p className="text-gray-300 text-sm leading-relaxed">{signal.analysis}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}