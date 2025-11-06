// ============================================================
// 🚀 ELIMS Server Entry Point (Express 5 + Socket.IO + Docker Ready)
// ============================================================

const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const compression = require("compression");
const helmet = require("helmet");
const colors = require("colors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const pool = require("./config/database");

// 🟢 FIX: Only load .env file if NOT in a 'production' environment (like Docker)
if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development, loading .env file...');
  dotenv.config();
} else {
  console.log('Running in production, using container environment variables...');
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ============================================================
// 🧩 CORE MIDDLEWARE
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());

// ============================================================
// 🌍 CORS CONFIGURATION (Optimized for Docker + Localhost)
// ============================================================

// Define all known good origins
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://192.168.18.48:5173", // From your previous logs
  "http://172.20.10.4:5173"   // From your previous logs
];

let allowedOrigins = defaultOrigins;
if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "false") {
  const envOrigins = process.env.CORS_ORIGIN.split(",").map((s) => s.trim());
  allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (like Postman) or same-origin requests
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`❌ CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// ============================================================
// 🧠 SAFE JSON PARSER (Avoid parsing GET bodies)
// ============================================================
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  express.json({ limit: "10mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads, PDFs, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Dev logging
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// ============================================================
// 🧠 DATABASE CHECK
// ============================================================
(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully.".green.bold);
  } catch (err) {
    console.error("❌ Database connection failed:".red, err.message);
    process.exit(1);
  }
})();

// ============================================================
// 🌐 SOCKET.IO INITIALIZATION
// ============================================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ============================================================
// 🔐 SOCKET AUTHENTICATION (JWT)
// ============================================================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.warn("⚠️ Socket connection attempt without token.");
      return next(new Error("Unauthorized: No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    const dept = decoded?.department?.toLowerCase?.();
    if (dept) {
  nbsp;     socket.join(`dept-${dept}`);
      console.log(`🏥 ${decoded.full_name} joined room dept-${dept}`);
    }

    next();
  } catch (err) {
    console.error("❌ Socket authentication failed:", err.message);
    next(new Error("Unauthorized"));
  }
});

// ============================================================
// 🎧 SOCKET EVENTS
// ============================================================
io.on("connection", (socket) => {
  const user = socket.user?.full_name || "Unknown";
  const dept = socket.user?.department || "N/A";
  console.log(`🧩 Socket connected: ${user} (${dept})`);

  socket.on("joinRoom", (room) => {
    // Removed stray 't' character
    if (room) { 
      socket.join(room);
      console.log(`🔗 ${user} joined custom room: ${room}`);
    }
  });

  socket.on("ping", () => {
    socket.emit("pong", { ts: new Date().toISOString() });
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Socket disconnected: ${user} (${dept}) - ${reason}`);
  });
});

app.set("io", io);

// ============================================================
// 🧭 ROUTES IMPORT
// ============================================================
const routes = {
  auth: require("./routes/authRoutes"),
  authSecurity: require("./routes/authSecurityRoutes"),
  users: require("./routes/userRoutes"),
  patients: require("./routes/patientRoutes"),
  testCatalog: require("./routes/testCatalogRoutes"),
  labConfig: require("./routes/labConfigRoutes"),
  panels: require("./routes/panelsRoutes"),
  testRequests: require("./routes/testRequestRoutes"),
  billing: require("./routes/billingRoutes"),
  inventory: require("./routes/inventoryRoutes"),
  settings: require("./routes/settingsRoutes"),
  wards: require("./routes/wardRoutes"),
  invoices: require("./routes/invoicesRoutes"),
  phlebotomy: require("./routes/phlebotomyRoutes"),
  pathologist: require("./routes/pathologistRoutes"), 
  reports: require("./routes/reportsRoutes"),
  audit: require("./routes/auditRoutes"),
  database: require("./routes/databaseRoutes"),
  roles: require("./routes/rolesRoutes"),
  search: require("./routes/searchRoutes"),
  departments: require("./routes/departmentRoutes"), 
  sampleTypes: require("./routes/sampleTypeRoutes"), 
  imports: require("./routes/importRoutes"),
  profileProfessional: require("./routes/profileProfessionalRoutes"),
  apiKeys: require("./routes/apiKeyRoutes"),
  ingestEvents: require("./routes/ingestEventsRoutes"),
  instruments: require("./routes/instrumentsRoutes"),
  lis: require("./routes/lisRoutes"),
  me: require("./routes/meRoutes"),
  public: require("./routes/publicRoutes"),
};

// ============================================================
// 🛣️ ROUTE MOUNTING
// ============================================================
app.use("/api/auth", routes.auth);
app.use("/api/auth", routes.authSecurity);
app.use("/api/users", routes.users);
app.use("/api/patients", routes.patients);
app.use("/api/test-catalog", routes.testCatalog);
app.use("/api/lab-config", routes.labConfig);
app.use("/api/lab-config/panels", routes.panels);
app.use("/api/sample-types", routes.sampleTypes);
app.use("/api/departments", routes.departments);
app.use("/api/wards", routes.wards);
app.use("/api/test-requests", routes.testRequests);
app.use("/api/billing", routes.billing);
app.use("/api/invoices", routes.invoices);
app.use("/api/inventory", routes.inventory);
app.use("/api/settings", routes.settings);
app.use("/api/roles", routes.roles);
app.use("/api/phlebotomy", routes.phlebotomy);
app.use("/api/pathologist", routes.pathologist);
app.use("/api/reports", routes.reports);
app.use("/api/search", routes.search);
app.use("/api/audit-logs", routes.audit);
app.use("/api/database", routes.database);
app.use("/api/import", routes.imports);
app.use("/api/profile", routes.profileProfessional);
app.use("/api/keys", routes.apiKeys);
app.use("/api/ingest-events", routes.ingestEvents);
app.use("/api/instruments", routes.instruments);
app.use("/api/lis", routes.lis);
app.use("/api/me", routes.me);
app.use("/api", routes.public);

// ============================================================
// 💓 HEALTH CHECKS
// ============================================================
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 ELIMS API is running successfully!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW()");
    res.json({ ok: true, db_time: rows[0].now, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ============================================================
// 🔍 404 HANDLER
// ============================================================
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    console.log(`[404] ${req.method} ${req.originalUrl}`.yellow);
    return res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
  next();
});

// ============================================================
// 🧯 GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (process.env.NODE_ENV !== "production") {
    console.error("💥 Error:", err.stack || err);
  }
  res.status(status).json({ 
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ============================================================
// 🌍 START SERVER + SHUTDOWN HANDLERS
// ============================================================
const PORT = process.env.PORT || 5000;

// FIX: Bind to '0.0.0.0' to be accessible from outside the container
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌍 ELIMS Server running on port ${PORT}`.cyan.bold);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
});
