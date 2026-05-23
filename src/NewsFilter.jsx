import { useState, useEffect } from "react";

const HIGH_IMPACT_EVENTS = [
  { time: "08:30", day: 1, name: "USD CPI", impact: "HIGH" },
  { time: "08:30", day: 5, name: "USD NFP", impact: "HIGH" },
  { time: "14:00", day: 3, name: "FOMC Statement", impact: "HIGH" },
  { time: "08:30", day: 4, name: "USD GDP", impact: "HIGH" },
  { time: "08:30", day: 2, name: "USD PPI", impact: "HIGH" },
  { time: "10:00", day: 3, name: "USD ISM", impact: "MEDIUM" },
  { time: "08:30", day: 4, name: "USD Jobless Claims", impact: "MEDIUM" },
];

export default function NewsFilter() {
  const [events, setEvents] = useState([]);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    const now = new Date();
    const currentDay = now.getUTCDay();
    const currentHour = now.getUTCHours();
    const currentMin = now.getUTCMinutes();
    const currentTime = currentHour + currentMin / 60;

    const todayEvents = HIGH_IMPACT_EVENTS.filter(e => e.day === currentDay);
    setEvents(todayEvents);

    // Check if any event is within 30 minutes
    for (const event of todayEvents) {
      const [h, m] = event.time.split(":").map(Number);
      const eventTime = h + m / 60;
      const diff = eventTime - currentTime;

      if (diff > 0 && diff <= 0.5) {
        setWarning(`⚠️ ${event.name} in ${Math.round(diff * 60)} minutes — Avoid trading!`);
        break;
      } else if (diff > -0.25 && diff <= 0) {
        setWarning(`🔴 ${event.name} happening NOW — Stay out!`);
        break;
      }
    }
  }, []);

  return (
    <div className="bg-[#111118]/80 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
      <div className="p-3 border-b border-white/10">
        <p className="text-gray-300 text-xs uppercase tracking-wider font-semibold">📰 News Filter</p>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {warning && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-2">
            <p className="text-red-300 text-xs font-semibold">{warning}</p>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-gray-500 text-xs">No high impact news today.</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-gray-400 text-xs mb-1">Today's Events (UTC):</p>
            {events.map((e, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${e.impact === "HIGH" ? "bg-red-400" : "bg-yellow-400"}`}></span>
                  <span className="text-white text-xs">{e.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${e.impact === "HIGH" ? "text-red-400" : "text-yellow-400"}`}>{e.impact}</span>
                  <span className="text-gray-400 text-xs">{e.time} UTC</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-gray-600 text-xs mt-1">Avoid trading 30 min before/after HIGH impact events.</p>
      </div>
    </div>
  );
}