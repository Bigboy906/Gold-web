import { useState, useEffect } from "react";

const card = {
  background: "rgba(17,17,24,0.85)",
  backdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 8,
  padding: 8,
  border: "1px solid rgba(255,255,255,0.07)",
};

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
    <div style={card}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>📊 Multi-Timeframe Confluence</p>
      </div>
      <div style={{ padding: 12 }}>
        {loading && <p style={{ color: "#6b7280", fontSize: 12 }}>Analysing timeframes...</p>}
        {data && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>Overall</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{data.confluenceScore} Confluence</span>
                <span style={{
                  padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: "bold",
                  background: data.overall === "BUY" ? "rgba(34,197,94,0.12)" : data.overall === "SELL" ? "rgba(239,68,68,0.12)" : "rgba(107,114,128,0.12)",
                  color: data.overall === "BUY" ? "#4ade80" : data.overall === "SELL" ? "#f87171" : "#9ca3af",
                  border: data.overall === "BUY" ? "1px solid rgba(34,197,94,0.25)" : data.overall === "SELL" ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(107,114,128,0.25)",
                }}>{data.overall}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.timeframes?.map((tf, i) => (
                <div key={i} style={rowStyle}>
                  <span style={{ color: "#d1d5db", fontSize: 12, fontWeight: 500, width: 32 }}>{tf.tf}</span>
                  <div style={{ flex: 1, margin: "0 10px" }}>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: tf.direction === "BUY" ? "#22c55e" : tf.direction === "SELL" ? "#ef4444" : "#6b7280",
                        width: `${tf.confidence}%`,
                      }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>{tf.confidence}%</span>
                    <span style={{
                      fontSize: 12, fontWeight: "bold",
                      color: tf.direction === "BUY" ? "#4ade80" : tf.direction === "SELL" ? "#f87171" : "#9ca3af",
                    }}>{tf.direction}</span>
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

