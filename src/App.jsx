import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";

export default function Chart({ signal, interval }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0d0d14" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const pair = signal?.pair || "XAU/USD";
    const intervalMap = { "5m": "5min", "15m": "15min", "30m": "30min", "1H": "1h", "4H": "4h" };
    const apiInterval = intervalMap[interval] || "15min";

    // Fetch real candle data
    fetch(`https://gold-web.onrender.com/candles?pair=${encodeURIComponent(pair)}&interval=${apiInterval}`)
      .then(r => r.json())
      .then(data => {
        if (data.candles && data.candles.length > 0) {
          candleSeries.setData(data.candles);
          setLoading(false);
        } else {
          // Fallback to placeholder
          usePlaceholder(candleSeries, signal);
          setLoading(false);
        }
      })
      .catch(() => {
        usePlaceholder(candleSeries, signal);
        setLoading(false);
      });

    function usePlaceholder(series, sig) {
      const now = Math.floor(Date.now() / 1000);
      const candles = [];
      let price = sig ? parseFloat(sig.entry) : 2340;
      for (let i = 50; i >= 0; i--) {
        const time = now - i * 900;
        const open = price;
        const change = (Math.random() - 0.48) * 8;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 4;
        const low = Math.min(open, close) - Math.random() * 4;
        candles.push({ time, open, high, low, close });
        price = close;
      }
      series.setData(candles);
    }

    // Draw signal lines
    if (signal) {
      const entry = parseFloat(signal.entry);
      const tp = parseFloat(signal.takeProfit);
      const sl = parseFloat(signal.stopLoss);
      const now = Math.floor(Date.now() / 1000);
      const start = now - 900;
      const end = now + 3600 * 4;

      const entryLine = chart.addSeries(LineSeries, {
        color: "#f59e0b", lineWidth: 2, lineStyle: 2,
        title: `Entry ${entry}`, priceLineVisible: false, lastValueVisible: true,
      });
      entryLine.setData([{ time: start, value: entry }, { time: end, value: entry }]);

      const tpLine = chart.addSeries(LineSeries, {
        color: "#22c55e", lineWidth: 2, lineStyle: 2,
        title: `TP ${tp}`, priceLineVisible: false, lastValueVisible: true,
      });
      tpLine.setData([{ time: start, value: tp }, { time: end, value: tp }]);

      const slLine = chart.addSeries(LineSeries, {
        color: "#ef4444", lineWidth: 2, lineStyle: 2,
        title: `SL ${sl}`, priceLineVisible: false, lastValueVisible: true,
      });
      slLine.setData([{ time: start, value: sl }, { time: end, value: sl }]);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [signal, interval]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d14", borderRadius: 16, zIndex: 1 }}>
          <p style={{ color: "#9ca3af", fontSize: 12 }}>Loading chart...</p>
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }} />
    </div>
  );
}