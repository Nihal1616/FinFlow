const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const socketAllowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
].filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || socketAllowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST"],
  },
});

// Expose io to routes via app.locals
app.locals.io = io;

// Track connected users: userId → socketId
const connectedUsers = new Map();
app.locals.connectedUsers = connectedUsers;

io.on("connection", (socket) => {
  console.log("[Socket] Client connected:", socket.id);

  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`[Socket] User ${userId} registered`);
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of connectedUsers.entries()) {
      if (sid === socket.id) {
        connectedUsers.delete(uid);
        break;
      }
    }
    console.log("[Socket] Client disconnected:", socket.id);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://fin-flow-red.vercel.app",
  "https://fin-flow-7k5w380j2-nihal1616s-projects.vercel.app",
  "https://fin-flow-5mv7idett-nihal1616s-projects.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());
app.use(morgan("dev"));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api", globalLimiter);

// Strict rate limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many auth attempts. Please wait 15 minutes.",
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/transactions", require("./routes/transactions"));
app.use("/api/users", require("./routes/users"));

// Health check
app.get("/health", (_, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Error]", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("[DB] MongoDB connected");

    try {
      const usersCollection = mongoose.connection.db.collection("users");
      const staleUserIndexes = [
        "username_1",
        "AccountNumber_1",
        "accountNumber_1",
      ];
      for (const idx of staleUserIndexes) {
        try {
          const exists = await usersCollection.indexExists(idx);
          if (exists) {
            await usersCollection.dropIndex(idx);
            console.log(`[DB] Dropped stale users index ${idx}`);
          }
        } catch (e) {
          if (e.codeName !== "IndexNotFound") {
            console.warn(
              `[DB] Could not drop stale users index ${idx}:`,
              e.message,
            );
          }
        }
      }

      const walletsCollection = mongoose.connection.db.collection("wallets");
      const staleWalletIndexes = ["accountNumber_1", "AccountNumber_1"];
      for (const idx of staleWalletIndexes) {
        try {
          const exists = await walletsCollection.indexExists(idx);
          if (exists) {
            await walletsCollection.dropIndex(idx);
            console.log(`[DB] Dropped stale wallets index ${idx}`);
          }
        } catch (e) {
          if (e.codeName !== "IndexNotFound") {
            console.warn(
              `[DB] Could not drop stale wallets index ${idx}:`,
              e.message,
            );
          }
        }
      }

      const transactionsCollection =
        mongoose.connection.db.collection("transactions");
      const staleTransactionIndexes = [
        "referenceId_1",
        "ReferenceId_1",
        "referenceid_1",
      ];
      for (const idx of staleTransactionIndexes) {
        try {
          const exists = await transactionsCollection.indexExists(idx);
          if (exists) {
            await transactionsCollection.dropIndex(idx);
            console.log(`[DB] Dropped stale transactions index ${idx}`);
          }
        } catch (e) {
          if (e.codeName !== "IndexNotFound") {
            console.warn(
              `[DB] Could not drop stale transactions index ${idx}:`,
              e.message,
            );
          }
        }
      }
    } catch (err) {
      console.warn("[DB] Could not check/drop stale indexes:", err.message);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`[Server] Running on http://localhost:${PORT}`),
    );
  })
  .catch((err) => {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  });
