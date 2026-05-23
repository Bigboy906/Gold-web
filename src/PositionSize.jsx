import { useState } from "react";

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
    <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
      <div className="p-3 border-b border-white/10">
        <p className="text-gray-300 text-xs uppercase tracking-wider font-semibold">💰 Position Size Calculator</p>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="text-gray-400 text-xs mb-1">Account Balance (USD)</p>
          <input
            type="number"
            value={accountBalance}
            onChange={e => setAccountBalance(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-500/50"
          />
        </div>

        <div>
          <p className="text-gray-400 text-xs mb-1">Risk %</p>
          <div className="flex gap-1.5">
            {["0.5", "1", "1.5", "2"].map(r => (
              <button key={r} onClick={() => setRiskPercent(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  riskPercent === r
                    ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                }`}>{r}%</button>
            ))}
          </div>
        </div>

        {!signal && (
          <p className="text-gray-500 text-xs">Run an analysis first to calculate position size.</p>
        )}

        {signal && (
          <button onClick={calculate}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            Calculate
          </button>
        )}

        {result && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
              <p className="text-gray-400 text-xs mb-0.5">Risk Amount</p>
              <p className="text-red-400 font-bold text-xs">${result.riskAmount}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
              <p className="text-gray-400 text-xs mb-0.5">Lot Size</p>
              <p className="text-yellow-400 font-bold text-xs">{result.lotSize}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
              <p className="text-gray-400 text-xs mb-0.5">SL Distance</p>
              <p className="text-white font-bold text-xs">{result.slPips} pts</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
              <p className="text-gray-400 text-xs mb-0.5">Potential Profit</p>
              <p className="text-green-400 font-bold text-xs">${result.potentialProfit}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}