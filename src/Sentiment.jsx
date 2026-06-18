import { useState, useEffect } from "react";

const card = {
  background: "rgba(17,17,24,0.85)",
  backdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
};

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
    <div style={card}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>📰 News Sentiment</p>
      </div>
      <div style={{ padding: 12 }}>
        {loading && <p style={{ color: "#6b7280", fontSize: 12 }}>Analysing news...</p>}
        {data && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{
                fontSize: 14, fontWeight: "bold",
                color: data.sentiment === "Bullish" ? "#4ade80" : data.sentiment === "Bearish" ? "#f87171" : "#9ca3af",
              }}>{data.sentiment}</span>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>{data.sentimentScore}% confidence</span>
            </div>

            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ background: "#22c55e", width: `${data.bullScore / (data.bullScore + data.bearScore || 1) * 100}%`, transition: "width 0.3s" }} />
              <div style={{ background: "#ef4444", width: `${data.bearScore / (data.bullScore + data.bearScore || 1) * 100}%`, transition: "width 0.3s" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
              <span style={{ color: "#4ade80" }}>🟢 Bullish signals: {data.bullScore}</span>
              <span style={{ color: "#f87171" }}>🔴 Bearish signals: {data.bearScore}</span>
            </div>

            {data.headlines?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 2 }}>Latest Headlines:</p>
                {data.headlines.map((h, i) => (
                  <p key={i} style={{
                    color: "#9ca3af", fontSize: 12, lineHeight: 1.5,
                    borderLeft: "2px solid rgba(255,255,255,0.08)", paddingLeft: 8,
                  }}>{h}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

