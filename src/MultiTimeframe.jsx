import { useState, useEffect } from "react";

export default function MultiTimeframe({ pair }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pair) return;
    setLoading(true);
    fetch(`https://gold-web.onrender.com/mtf/${encodeURIComponent(pair)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pair]);

  return (
    <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
      <div className="p-3 border-b border-white/10">
        <p className="text-gray-300 text-xs uppercase tracking-wider font-semibold">📊 Multi-Timeframe Confluence</p>
      </div>
      <div className="p-3">
        {loading && <p className="text-gray-500 text-xs">Analysing timeframes...</p>}
        {data && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">Overall</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">{data.confluenceScore} Confluence</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  data.overall === "BUY" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  data.overall === "SELL" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                  "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                }`}>{data.overall}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {data.timeframes?.map((tf, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                  <span className="text-gray-300 text-xs font-medium w-8">{tf.tf}</span>
                  <div className="flex-1 mx-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${tf.direction === "BUY" ? "bg-green-500" : tf.direction === "SELL" ? "bg-red-500" : "bg-gray-500"}`}
                        style={{ width: `${tf.confidence}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs">{tf.confidence}%</span>
                    <span className={`text-xs font-bold ${
                      tf.direction === "BUY" ? "text-green-400" :
                      tf.direction === "SELL" ? "text-red-400" : "text-gray-400"
                    }`}>{tf.direction}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}