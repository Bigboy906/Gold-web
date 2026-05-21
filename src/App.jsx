import { useState, useEffect } from "react";

function App() {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const res = await fetch("http://localhost:3001/signal");
        const data = await res.json();
        if (data.pair) {
          setSignal(data);
        }
      } catch (err) {
        console.error("Error fetching signal:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignal();
    const interval = setInterval(fetchSignal, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh", color: "white", fontFamily: "sans-serif", padding: "20px", maxWidth: "480px", margin: "0 auto" }}>
      <h1 style={{ color: "#f0b90b", textAlign: "center" }}>XAUUSD Signal</h1>

      {loading ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : signal ? (
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "20px", fontWeight: "bold" }}>{signal.pair}</span>
            <span style={{ background: signal.direction === "BUY" ? "#00c853" : "#ff1744", padding: "4px 12px", borderRadius: "6px", fontWeight: "bold" }}>
              {signal.direction}
            </span>
          </div>

          <div style={{ background: "#111", borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
            <p>Confidence: <strong>{signal.confidence}%</strong></p>
            <p>Pattern: <strong>{signal.pattern}</strong></p>
            <p>Trend: <strong>{signal.trend}</strong></p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div style={{ background: "#111", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ color: "#888", fontSize: "12px" }}>ENTRY</p>
              <p style={{ color: "#f0b90b" }}>{signal.entry}</p>
            </div>
            <div style={{ background: "#111", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ color: "#888", fontSize: "12px" }}>TARGET</p>
              <p style={{ color: "#00c853" }}>{signal.takeProfit}</p>
            </div>
            <div style={{ background: "#111", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ color: "#888", fontSize: "12px" }}>STOP</p>
              <p style={{ color: "#ff1744" }}>{signal.stopLoss}</p>
            </div>
          </div>

          <div style={{ background: "#111", borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
            <p style={{ color: "#888", fontSize: "12px" }}>AI ANALYSIS</p>
            <p style={{ fontSize: "14px" }}>{signal.analysis}</p>
          </div>

          <p style={{ color: "#555", fontSize: "11px", textAlign: "center" }}>
            Last updated: {new Date(signal.timestamp).toLocaleTimeString()}
          </p>

          <button style={{ width: "100%", background: "#f0b90b", color: "#000", border: "none", padding: "14px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
            ⚡ Copy This Trade
          </button>
        </div>
      ) : (
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
          <p style={{ fontSize: "40px" }}>⏳</p>
          <p>Waiting for signal from TradingView...</p>
          <p style={{ color: "#555", fontSize: "12px" }}>Checks every 10 seconds</p>
        </div>
      )}
    </div>
  );
}

export default App;