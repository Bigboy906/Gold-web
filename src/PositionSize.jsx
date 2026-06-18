import { useState } from "react";

const card = {
  background: "rgba(17,17,24,0.85)",
  backdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const statBox = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 8,
  padding: 10,
  border: "1px solid rgba(255,255,255,0.07)",
};

export default function PositionSize({ signal }) {
  const [accountBalance, setAccountBalance] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");
  const [result, setResult] = useState(null);

  const calculate = () => {
    if (!accountBalance || !signal) return;

    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent) / 100;
    const entry = parseFloat(signal.entry);
    const sl = parseFloat(signal.stopLoss);

    const riskAmount = balance * risk;
    const slPips = Math.abs(entry - sl);
    const lotSize = riskAmount / (slPips * 100);
    const potentialProfit = riskAmount * parseFloat(signal.rr.split(":")[1]);

    setResult({
      riskAmount: riskAmount.toFixed(2),
      lotSize: lotSize.toFixed(2),
      slPips: slPips.toFixed(2),
      potentialProfit: potentialProfit.toFixed(2),
    });
  };

  return (
    <div style={card}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>💰 Position Size Calculator</p>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>Account Balance (USD)</p>
          <input
            type="number"
            value={accountBalance}
            onChange={e => setAccountBalance(e.target.value)}
            placeholder="e.g. 1000"
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "8px 10px", color: "#e5e7eb", fontSize: 12,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>Risk %</p>
          <div style={{ display: "flex", gap: 6 }}>
            {["0.5", "1", "1.5", "2"].map(r => (
              <button key={r} onClick={() => setRiskPercent(r)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: riskPercent === r ? "#f59e0b" : "rgba(255,255,255,0.06)",
                  color: riskPercent === r ? "black" : "#d1d5db",
                  border: riskPercent === r ? "none" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: riskPercent === r ? "0 0 10px rgba(234,179,8,0.4)" : "none",
                }}>{r}%</button>
            ))}
          </div>
        </div>

        {!signal && (
          <p style={{ color: "#6b7280", fontSize: 12 }}>Run an analysis first to calculate position size.</p>
        )}

        {signal && (
          <button onClick={calculate}
            style={{
              width: "100%", background: "#f59e0b", color: "black", fontWeight: "bold",
              padding: "10px 0", borderRadius: 10, fontSize: 13, cursor: "pointer", border: "none",
              boxShadow: "0 0 15px rgba(234,179,8,0.3)",
            }}>
            Calculate
          </button>
        )}

        {result && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={statBox}>
              <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 3 }}>Risk Amount</p>
              <p style={{ color: "#f87171", fontWeight: "bold", fontSize: 13 }}>${result.riskAmount}</p>
            </div>
            <div style={statBox}>
              <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 3 }}>Lot Size</p>
              <p style={{ color: "#f59e0b", fontWeight: "bold", fontSize: 13 }}>{result.lotSize}</p>
            </div>
            <div style={statBox}>
              <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 3 }}>SL Distance</p>
              <p style={{ color: "white", fontWeight: "bold", fontSize: 13 }}>{result.slPips} pts</p>
            </div>
            <div style={statBox}>
              <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 3 }}>Potential Profit</p>
              <p style={{ color: "#4ade80", fontWeight: "bold", fontSize: 13 }}>${result.potentialProfit}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

