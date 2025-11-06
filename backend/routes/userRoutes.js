const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

// --- Profile routes for logged-in user ---
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.put('/profile/change-password', protect, changePassword);
router.put('/profile/picture', protect, upload.single('profile_picture'), uploadProfilePicture);

// --- General routes ---
router.get('/doctors', protect, getDoctors);
router.get('/active', protect, getActiveUsers);

// --- Admin staff management ---
router.route('/')
  .get(protect, authorize('staff', 'view'), getAllUsers)
  .post(protect, authorize('staff', 'create'), createUser);

router.route('/:id')
  .put(protect, authorize('staff', 'edit'), updateUser)
  .delete(protect, authorize('staff', 'delete'), deleteUser);

// --- Admin password reset ---
router.put('/:id/set-password', protect, authorize('staff', 'edit'), adminSetPassword);

module.exports = router;
