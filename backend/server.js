const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

let latestSignal = null;

// TradingView will send signals here
app.post("/webhook", (req, res) => {
  const data = req.body;
  console.log("Signal received:", data);

  latestSignal = {
    pair: data.pair || "XAU/USD",
    direction: data.direction || "BUY",
    entry: data.entry || 0,
    takeProfit: data.takeProfit || 0,
    stopLoss: data.stopLoss || 0,
    rr: data.rr || "1:2",
    confidence: data.confidence || 50,
    pattern: data.pattern || "",
    trend: data.trend || "",
    analysis: data.analysis || "",
    timestamp: new Date().toISOString(),
  };

  res.json({ status: "ok" });
});

// Frontend fetches latest signal from here
app.get("/signal", (req, res) => {
  if (latestSignal) {
    res.json(latestSignal);
  } else {
    res.json({ message: "No signal yet" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});