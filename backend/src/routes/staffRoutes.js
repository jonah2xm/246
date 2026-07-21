const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { listStaff, clockIn, clockOut, myShift, performanceToday } = require("../controllers/staffController");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRole("cashier", "manager"), listStaff);
router.post("/shifts/clock-in", clockIn);
router.post("/shifts/clock-out", clockOut);
router.get("/shifts/mine", myShift);
router.get("/performance/today", requireRole("manager"), performanceToday);

module.exports = router;
