require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { connectDatabase } = require("./config/db");
const placeRoutes = require("./routes/placeRoutes");
const checkInRoutes = require("./routes/checkInRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const guideRoutes = require("./routes/guideRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI;
const publicPath = path.join(__dirname, "public");

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in environment variables.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Tourism Intelligence API is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/places", placeRoutes);
app.use("/api/checkins", checkInRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/guides", guideRoutes);

app.use(express.static(publicPath, { index: false }));

app.get("/", (req, res) => {
  return res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/login", (req, res) => {
  return res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/welcome", (req, res) => {
  return res.sendFile(path.join(publicPath, "welcome.html"));
});

app.get("/app", (req, res) => {
  return res.sendFile(path.join(publicPath, "dashboard.html"));
});

app.get("/about", (req, res) => {
  return res.sendFile(path.join(publicPath, "about.html"));
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "API route not found",
    });
  }

  return res.sendFile(path.join(publicPath, "index.html"));
});

async function startServer() {
  await connectDatabase(MONGO_URI);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

