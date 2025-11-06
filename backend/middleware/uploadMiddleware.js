// backend/middleware/uploadLogo.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const logoDir = path.join(__dirname, "..", "uploads", "logos");
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: logoDir,
  filename: (req, file, cb) =>
    cb(null, `file-${Date.now()}${path.extname(file.originalname)}`),
});

function checkFileType(file, cb) {
  const ok = /jpeg|jpg|png|svg/.test(
    path.extname(file.originalname).toLowerCase()
  ) && /image\/(jpeg|png|svg\+xml)/.test(file.mimetype);
  cb(ok ? null : "Only jpeg/jpg/png/svg images are allowed", ok);
}

const uploadLogo = multer({
  storage,
  limits: { fileSize: 1_000_000 },
  fileFilter: (req, file, cb) => checkFileType(file, cb),
});

module.exports = uploadLogo;
