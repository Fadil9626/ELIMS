// ============================================================
// 🚀 ELIMS Server Entry Point (FINAL PRODUCTION-STABLE VERSION)
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
const { Server } = require("socket.io");

// ----------------------------------------------
// Load .env (LOCAL DEV ONLY)
// ----------------------------------------------
if (process.env.NODE_ENV !== "production") {
  console.log("🔧 Development mode: Loading .env");
  dotenv.config();
}

// ----------------------------------------------
// Validate ENV
// ----------------------------------------------
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing");
  process.exit(1);
}

// DB
const pool = require("./config/database");

// Audit Auto Logger
const { auditAutoLogger } = require("./middleware/auditAutoLogger");

// Standard protect middleware (already existing)
const { protect } = require("./middleware/authMiddleware");

// ----------------------------------------------
// Express App Init
// ----------------------------------------------
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ----------------------------------------------
// Security headers
// ----------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(compression());

// ============================================================
// 🔥 FINAL FIXED CORS BLOCK — WORKS FOR LOCAL + LAN + PROD
// ============================================================
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((x) => x.trim())
  .filter((x) => x.length > 0);

console.log("🌐 Allowed CORS Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow mobile/curl

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS BLOCKED:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------------------------------
// Body Parsers (must come BEFORE audit logger)
// ----------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------
// Static Uploads
// ----------------------------------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ----------------------------------------------
// DB Health Check
// ----------------------------------------------
(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Database connected".green.bold);
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
})();

// ----------------------------------------------
// Socket.IO Setup
// ----------------------------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// ✅ FIX: make io available to socketEmitter.js via req.app.get("io")
app.set("io", io);

// Attach socket to req (you already had this)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ----------------------------------------------
// Global Audit-Logger
// ----------------------------------------------
app.use(auditAutoLogger());

// ----------------------------------------------
// Route Imports
// ----------------------------------------------
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
  visits: require("./routes/visitRoutes"),
  messages: require("./routes/messageRoutes"),
  notifications: require("./routes/notificationRoutes"),
  // ➕ NEW: Medical Records Route
  medicalRecords: require("./routes/medicalRecordsRoutes"),
};

// ----------------------------------------------
// Public Route
// ----------------------------------------------
app.use("/api/auth", routes.auth);

// ----------------------------------------------
// Protected Routes (their own files use protect)
// ----------------------------------------------
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
app.use("/api/visits", routes.visits);
app.use("/api/messages", routes.messages);
app.use("/api/notifications", routes.notifications);
// ➕ NEW: Wire up the route
app.use("/api/medical-records", routes.medicalRecords);

app.use("/api/reception", require("./routes/receptionRoutes"));


// ----------------------------------------------
// Dashboard Routes
// ----------------------------------------------
const dashboardController = require("./controllers/dashboardController");

app.get(
  "/api/billing/dashboard-stats",
  protect,
  dashboardController.getDashboardStats
);

app.get(
  "/api/billing/analytics",
  protect,
  dashboardController.getMonthlyAnalytics
);

// ----------------------------------------------
// 404 Handler
// ----------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

// ----------------------------------------------
// Global Error Handler
// ----------------------------------------------
app.use((err, req, res, next) => {
  console.error("💥 ERROR:", err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ----------------------------------------------
// Start Server
// ----------------------------------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () =>
  console.log(`🌍 ELIMS API running on http://localhost:${PORT}`.cyan.bold)
);