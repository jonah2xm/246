const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  createOrder,
  listActive,
  listToday,
  listUnpaid,
  updateStatus,
  updateItems,
  markPaid,
  getPublicStatus,
} = require("../controllers/orderController");

const router = express.Router();

// Customer-facing
router.post("/", createOrder);
router.get("/:id/status", getPublicStatus);

// Staff-facing. Cashier can update status too — their UI only exposes
// cancellation, but the transition table is enforced server-side anyway.
router.get("/active", requireAuth, requireRole("kitchen", "manager"), listActive);
router.get("/today", requireAuth, requireRole("cashier", "manager"), listToday);
router.get("/unpaid", requireAuth, requireRole("cashier", "manager"), listUnpaid);
router.patch("/:id/status", requireAuth, requireRole("kitchen", "cashier", "manager"), updateStatus);
router.patch("/:id/items", requireAuth, requireRole("cashier", "manager"), updateItems);
router.patch("/:id/pay", requireAuth, requireRole("cashier", "manager"), markPaid);

module.exports = router;
