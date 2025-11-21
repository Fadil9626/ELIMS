// ============================================================
// USER ROUTES (Aligned with new RBAC + Audit Logger)
// ============================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getUserProfile,
  getDoctors,
  getAllUsers,
  getActiveUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserProfile,
  changePassword,
  uploadProfilePicture,
  adminSetPassword,
} = require("../controllers/userController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// ------------------------------------------------------------
// Create upload directory if missing
// ------------------------------------------------------------
const uploadDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ------------------------------------------------------------
// Multer Storage Config
// ------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// ------------------------------------------------------------
// LOGGED-IN USER (SELF PROFILE)
// ------------------------------------------------------------
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put("/profile/change-password", protect, changePassword);

router.put(
  "/profile/picture",
  protect,
  upload.single("profile_picture"),
  uploadProfilePicture
);

// ------------------------------------------------------------
// GENERAL USER ACCESS ROUTES
// ------------------------------------------------------------
router.get("/doctors", protect, getDoctors);
router.get("/active", protect, getActiveUsers);

// ------------------------------------------------------------
// ADMIN USER MANAGEMENT (RBAC PROTECTED)
// ------------------------------------------------------------
// GET ALL USERS + CREATE USER
router
  .route("/")
  .get(protect, authorize("users", "view"), getAllUsers)
  .post(protect, authorize("users", "create"), createUser);

// UPDATE + DELETE USER
router
  .route("/:id")
  .put(protect, authorize("users", "update"), updateUser)
  .delete(protect, authorize("users", "delete"), deleteUser);

// RESET USER PASSWORD (Admin)
router.put(
  "/:id/set-password",
  protect,
  authorize("users", "update"),
  adminSetPassword
);

module.exports = router;
