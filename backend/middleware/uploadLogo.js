// backend/middleware/uploadLogo.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const logoDir = path.join(__dirname, "..", "uploads", "logos");
fs.mkdirSync(logoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: logoDir,
  filename: (_req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function checkFileType(file, cb) {
  const ok = /jpeg|jpg|png|svg|webp/i;
  if (ok.test(file.mimetype) && ok.test(path.extname(file.originalname))) {
    return cb(null, true);
  }
  cb("Error: Only image files are allowed (jpg, png, svg, webp)");
}

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => checkFileType(file, cb),
});
