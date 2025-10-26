// backend/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ===== Load environment variables first =====
dotenv.config();

// ===== Import routes =====
import authRoutes from "./routes/auth.js";   // → /api/auth
import apiRoutes from "./routes/api.js";     // → /api
import adminRoutes from "./routes/admin.js"; // → /api/admin

const app = express();

// ===== Middleware =====
app.use(helmet());              // secure HTTP headers
app.use(express.json({ limit: "1mb" })); // parse JSON with limit
app.use(morgan("dev"));         // request logging

// ===== CORS Setup =====
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ===== Database Connection =====
async function connectDB(retries = 5, delay = 5000) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    if (retries > 0) {
      console.log(`🔄 Retrying in ${delay / 1000}s... (${retries} retries left)`);
      setTimeout(() => connectDB(retries - 1, delay), delay);
    } else {
      process.exit(1);
    }
  }
}
connectDB();

// ===== Routes =====
app.use("/api/auth", authRoutes);   // → /api/auth/login, /api/auth/register
app.use("/api", apiRoutes);         // → /api/submit (client form submissions)
app.use("/api/admin", adminRoutes); // → /api/admin/login, /api/admin/submissions

// Health check
app.get("/", (req, res) => res.json({ ok: true, service: "FixIt Online Backend" }));

// ===== 404 Not Found =====
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ===== Start Server =====
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
);

// ===== Graceful Shutdown =====
function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB connection closed.");
      process.exit(0);
    });
  });
}
["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => shutdown(sig)));
