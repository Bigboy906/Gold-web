import { useState, useEffect } from "react";

const card = {
  background: "rgba(17,17,24,0.85)",
  backdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const rowStyle = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 8,
  padding: 8,
  border: "1px solid rgba(255,255,255,0.07)",
};

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
      <div style={card}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>📋 Signal History</p>
        </div>
        <div style={{ padding: 14 }}>
          <p style={{ color: "#6b7280", fontSize: 12 }}>No signals yet. Run an analysis to start tracking.</p>
        </div>
      </div>
    );
  }

  const wins = history.filter(s => s.result === "win").length;
  const losses = history.filter(s => s.result === "loss").length;
  const winRate = history.filter(s => s.result).length > 0
    ? Math.round((wins / (wins + losses)) * 100)
    : null;

  return (
    <div style={card}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>📋 Signal History</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {winRate !== null && (
            <span style={{ fontSize: 12, fontWeight: "bold", color: winRate >= 50 ? "#4ade80" : "#f87171" }}>
              WR: {winRate}%
            </span>
          )}
          <button onClick={clearHistory} style={{ color: "#6b7280", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, maxHeight: 220, overflowY: "auto" }}>
        {history.slice().reverse().map((s, i) => (
          <div key={i} style={rowStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: "bold", color: s.direction === "BUY" ? "#4ade80" : "#f87171" }}>{s.direction}</span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{s.pair}</span>
                <span style={{ color: "#6b7280", fontSize: 11 }}>@ {s.entry}</span>
              </div>
              <span style={{ color: "#6b7280", fontSize: 11 }}>{new Date(s.timestamp).toLocaleDateString()}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#6b7280", fontSize: 11 }}>TP: <span style={{ color: "#4ade80" }}>{s.takeProfit}</span></span>
              <span style={{ color: "#6b7280", fontSize: 11 }}>SL: <span style={{ color: "#f87171" }}>{s.stopLoss}</span></span>
              <span style={{ color: "#6b7280", fontSize: 11 }}>RR: {s.rr}</span>
            </div>

            {!s.result ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => markResult(history.length - 1 - i, "win")}
                  style={{ flex: 1, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: "4px 0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  ✓ Win
                </button>
                <button onClick={() => markResult(history.length - 1 - i, "loss")}
                  style={{ flex: 1, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "4px 0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  ✗ Loss
                </button>
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: "4px 0", borderRadius: 8, fontSize: 11, fontWeight: "bold",
                background: s.result === "win" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                color: s.result === "win" ? "#4ade80" : "#f87171",
                border: s.result === "win" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
              }}>
                {s.result === "win" ? "✓ WIN" : "✗ LOSS"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

