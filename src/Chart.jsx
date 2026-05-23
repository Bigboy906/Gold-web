import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";

export default function Chart({ signal }) {
  const containerRef = useRef(null);

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

    // Generate placeholder candles
    const now = Math.floor(Date.now() / 1000);
    const candles = [];
    let price = signal ? parseFloat(signal.entry) : 2340;
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
    candleSeries.setData(candles);

    // Draw signal lines if signal exists
    if (signal) {
      const entry = parseFloat(signal.entry);
      const tp = parseFloat(signal.takeProfit);
      const sl = parseFloat(signal.stopLoss);
      const start = now - 900;
      const end = now + 3600 * 4;

      const entryLine = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        lineStyle: 2,
        title: `Entry ${entry}`,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      entryLine.setData([{ time: start, value: entry }, { time: end, value: entry }]);

      const tpLine = chart.addSeries(LineSeries, {
        color: "#22c55e",
        lineWidth: 2,
        lineStyle: 2,
        title: `TP ${tp}`,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      tpLine.setData([{ time: start, value: tp }, { time: end, value: tp }]);

      const slLine = chart.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: 2,
        title: `SL ${sl}`,
        priceLineVisible: false,
        lastValueVisible: true,
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
  }, [signal]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden border border-white/10" />
  );
}