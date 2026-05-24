import { useState, useEffect } from "react";

export default function Sentiment({ pair }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pair) return;
    setLoading(true);
    fetch(`https://gold-web.onrender.com/sentiment/${encodeURIComponent(pair)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pair]);

  return (
    <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
      <div className="p-3 border-b border-white/10">
        <p className="text-gray-300 text-xs uppercase tracking-wider font-semibold">📰 News Sentiment</p>
      </div>
      <div className="p-3">
        {loading && <p className="text-gray-500 text-xs">Analysing news...</p>}
        {data && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-bold ${
                data.sentiment === "Bullish" ? "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]" :
                data.sentiment === "Bearish" ? "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]" :
                "text-gray-400"
              }`}>{data.sentiment}</span>
              <span className="text-gray-400 text-xs">{data.sentimentScore}% confidence</span>
            </div>

            {/* Sentiment bar */}
            <div className="flex h-2 rounded-full overflow-hidden mb-3">
              <div className="bg-green-500 transition-all" style={{ width: `${data.bullScore / (data.bullScore + data.bearScore || 1) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${data.bearScore / (data.bullScore + data.bearScore || 1) * 100}%` }} />
            </div>

            <div className="flex justify-between text-xs mb-3">
              <span className="text-green-400">🟢 Bullish signals: {data.bullScore}</span>
              <span className="text-red-400">🔴 Bearish signals: {data.bearScore}</span>
            </div>

            {data.headlines?.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-gray-500 text-xs mb-1">Latest Headlines:</p>
                {data.headlines.map((h, i) => (
                  <p key={i} className="text-gray-400 text-xs leading-relaxed border-l-2 border-white/10 pl-2">{h}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}