const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
} = require("../controllers/departmentController");

const MODULE = "settings";

router
  .route("/")
  // ✅ FIX: Removed 'authorize' for GET. 
  // Now any logged-in user can see departments (required for dropdowns).
  .get(protect, getDepartments) 
  .post(protect, authorize(MODULE, "edit"), createDepartment);

router
  .route("/:id")
  .put(protect, authorize(MODULE, "edit"), updateDepartment)
  .delete(protect, authorize(MODULE, "edit"), deleteDepartment);

router.patch(
  "/:id/restore",
  protect,
  authorize(MODULE, "edit"),
  restoreDepartment
);

module.exports = router;