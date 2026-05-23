import { useState, useEffect } from "react";

export default function SignalHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("signalHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const markResult = (index, result) => {
    const updated = [...history];
    updated[index].result = result;
    setHistory(updated);
    localStorage.setItem("signalHistory", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("signalHistory");
  };

  if (history.length === 0) {
    return (
      <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 p-3">
        <p className="text-gray-300 text-xs uppercase tracking-wider font-semibold mb-2">📋 Signal History</p>
        <p className="text-gray-500 text-xs">No signals yet. Run an analysis to start tracking.</p>
      </div>
    );
  }

  const wins = history.filter(s => s.result === "win").length;
  const losses = history.filter(s => s.result === "loss").length;
  const winRate = history.filter(s => s.result).length > 0
    ? Math.round((wins / (wins + losses)) * 100)
    : null;

  return (
    <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <p className="text-gray-300 text-xs uppercase tracking-wider font-semibold">📋 Signal History</p>
        <div className="flex items-center gap-2">
          {winRate !== null && (
            <span className={`text-xs font-bold ${winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
              WR: {winRate}%
            </span>
          )}
          <button onClick={clearHistory} className="text-gray-500 text-xs hover:text-red-400 transition-colors">Clear</button>
        </div>
      </div>

      <div className="flex flex-col gap-1 p-2 max-h-48 overflow-y-auto">
        {history.slice().reverse().map((s, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${s.direction === "BUY" ? "text-green-400" : "text-red-400"}`}>
                  {s.direction}
                </span>
                <span className="text-gray-400 text-xs">{s.pair}</span>
                <span className="text-gray-500 text-xs">@ {s.entry}</span>
              </div>
              <span className="text-gray-500 text-xs">{new Date(s.timestamp).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-xs">TP: <span className="text-green-400">{s.takeProfit}</span></span>
              <span className="text-gray-500 text-xs">SL: <span className="text-red-400">{s.stopLoss}</span></span>
              <span className="text-gray-500 text-xs">RR: {s.rr}</span>
            </div>

            {!s.result ? (
              <div className="flex gap-1 mt-1.5">
                <button onClick={() => markResult(history.length - 1 - i, "win")}
                  className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg py-1 text-xs font-medium hover:bg-green-500/30 transition-colors">
                  ✓ Win
                </button>
                <button onClick={() => markResult(history.length - 1 - i, "loss")}
                  className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg py-1 text-xs font-medium hover:bg-red-500/30 transition-colors">
                  ✗ Loss
                </button>
              </div>
            ) : (
              <div className={`mt-1.5 text-center py-1 rounded-lg text-xs font-bold ${
                s.result === "win"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {s.result === "win" ? "✓ WIN" : "✗ LOSS"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}