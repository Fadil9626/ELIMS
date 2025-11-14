// ============================================================
// 🚀 ELIMS Server Entry Point (Express 5 + Socket.IO + Docker)
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

// ------------------------------------------------------------
// 🌱 Environment Config
// ------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  console.log("🔧 Development mode: Loading .env file");
  dotenv.config();
} else {
  console.log("🏭 Production mode: Using container environment variables");
}

// ------------------------------------------------------------
// 🧪 Critical Config Validation
// ------------------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.error("❌ FATAL: DATABASE_URL is not defined".red.bold);
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not defined".red.bold);
  process.exit(1);
}

// ------------------------------------------------------------
// 🗄 Database Connection
// ------------------------------------------------------------
const pool = require("./config/database");

// ------------------------------------------------------------
// 📊 Controllers (Dashboard)
// ------------------------------------------------------------
const dashboardController = require("./controllers/dashboardController");

// ------------------------------------------------------------
// 🔐 Auth Helpers
// ------------------------------------------------------------
const getTokenFromReq = (req) => {
  const h = req.headers.authorization || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
};

const requireAuth = (req, res, next) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// ------------------------------------------------------------
// 🌍 Express App Setup
// ------------------------------------------------------------
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());

// Allow frontend URLs
const allowedOrigins = (process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://localhost:8081")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// ------------------------------------------------------------
// 🧪 Verify DB Connection Before Starting
// ------------------------------------------------------------
(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully".green.bold);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
})();

// ------------------------------------------------------------
// 🔌 Socket.IO Real-Time System
// ------------------------------------------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
  pingTimeout: 20000,
  pingInterval: 10000,
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    socket.join(`user_${decoded.id}`);
    socket.join("broadcast");

    if (decoded.department) {
      socket.join(`dept-${decoded.department.toLowerCase()}`);
    }

    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log(`🧩 Socket connected: ${socket.user?.full_name} (${socket.id})`);
});

// Make socket available in all controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ------------------------------------------------------------
// 🛣 Route Imports
// ------------------------------------------------------------
const routes = {
  auth: require("./routes/authRoutes"),
  users: require("./routes/userRoutes"),
  patients: require("./routes/patientRoutes"),
  testCatalog: require("./routes/testCatalogRoutes"),
  labConfig: require("./routes/labConfigRoutes"),
  panels: require("./routes/panelsRoutes"),
  sampleTypes: require("./routes/sampleTypeRoutes"),
  departments: require("./routes/departmentRoutes"),
  wards: require("./routes/wardRoutes"),
  testRequests: require("./routes/testRequestRoutes"),
  billing: require("./routes/billingRoutes"),
  invoices: require("./routes/invoicesRoutes"),
  inventory: require("./routes/inventoryRoutes"),
  settings: require("./routes/settingsRoutes"),
  roles: require("./routes/rolesRoutes"),
  phlebotomy: require("./routes/phlebotomyRoutes"),
  pathologist: require("./routes/pathologistRoutes"),
  reports: require("./routes/reportsRoutes"),
  search: require("./routes/searchRoutes"),
  audit: require("./routes/auditRoutes"),
  database: require("./routes/databaseRoutes"),
  imports: require("./routes/importRoutes"),
  profile: require("./routes/profileProfessionalRoutes"),
  ingestEvents: require("./routes/ingestEventsRoutes"),
  instruments: require("./routes/instrumentsRoutes"),
  lis: require("./routes/lisRoutes"),
  me: require("./routes/meRoutes"),
  public: require("./routes/publicRoutes"),
  messages: require("./routes/messageRoutes"),
  notifications: require("./routes/notificationRoutes"), // 🆕
};

// ------------------------------------------------------------
// 🚦 Register API Endpoints
// ------------------------------------------------------------
app.use("/api/auth", routes.auth);
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
app.use("/api/profile", routes.profile);
app.use("/api/ingest-events", routes.ingestEvents);
app.use("/api/instruments", routes.instruments);
app.use("/api/lis", routes.lis);
app.use("/api/me", routes.me);
app.use("/api/visits", require("./routes/visitRoutes"));
app.use("/api/messages", routes.messages);
app.use("/api/notifications", routes.notifications);

// ------------------------------------------------------------
// 📊 Dashboard Inline Routes
// ------------------------------------------------------------
app.get("/api/billing/dashboard-stats", requireAuth, dashboardController.getDashboardStats);
app.get("/api/billing/analytics", requireAuth, dashboardController.getMonthlyAnalytics);

// ------------------------------------------------------------
// 💓 Health Check
// ------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ------------------------------------------------------------
// ❌ 404 Not Found
// ------------------------------------------------------------
app.use((req, res) => res.status(404).json({ success: false, message: "Not found" }));

// ------------------------------------------------------------
// 💥 Global Error Handler
// ------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error("💥 ERROR:", err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ------------------------------------------------------------
// 🚀 Start Server
// ------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🌍 ELIMS API running on http://localhost:${PORT}`.cyan.bold)
);
