const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/instrumentsController");

router.use(protect);                // require JWT

router.get("/", ctrl.list);         // GET /api/instruments
router.get("/:id", ctrl.getOne);    // GET /api/instruments/:id
router.post("/", ctrl.create);      // POST /api/instruments
router.put("/:id", ctrl.update);    // PUT /api/instruments/:id
router.delete("/:id", ctrl.remove); // DELETE /api/instruments/:id

module.exports = router;
