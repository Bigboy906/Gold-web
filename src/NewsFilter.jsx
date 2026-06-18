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
    <div style={card}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>📰 News Filter</p>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {warning && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: 10 }}>
            <p style={{ color: "#fca5a5", fontSize: 12, fontWeight: 600 }}>{warning}</p>
          </div>
        )}

        {events.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 12 }}>No high impact news today.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>Today's Events (UTC):</p>
            {events.map((e, i) => (
              <div key={i} style={rowStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: e.impact === "HIGH" ? "#f87171" : "#fbbf24", display: "inline-block" }}></span>
                  <span style={{ color: "#e5e7eb", fontSize: 12 }}>{e.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: e.impact === "HIGH" ? "#f87171" : "#fbbf24" }}>{e.impact}</span>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>{e.time} UTC</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>Avoid trading 30 min before/after HIGH impact events.</p>
      </div>
    </div>
  );
}

