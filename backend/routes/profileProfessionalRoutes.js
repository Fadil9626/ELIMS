const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const {
  getProfessionalProfile,
  updateProfessionalProfile,
  uploadSignature,
} = require("../controllers/professionalProfileController");

const router = express.Router();

// Multer storage for signatures
const dest = path.join(__dirname, "..", "uploads", "signatures");
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dest),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, "_");
    const ts = Date.now();
    cb(null, `sig_u${req.user.id}_${ts}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
});

// GET /api/profile/professional
router.get("/professional", protect, getProfessionalProfile);

// PATCH /api/profile/professional
router.patch("/professional", protect, updateProfessionalProfile);

// POST /api/profile/professional/signature
router.post(
  "/professional/signature",
  protect,
  upload.single("file"),
  uploadSignature
);

module.exports = router;
