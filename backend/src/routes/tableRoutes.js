const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  lookupSlug,
  mergeTables,
  splitSession,
  assignStaff,
  closeSession,
} = require("../controllers/tableController");

const router = express.Router();

// Public — customer QR validation, must sit before the auth wall.
router.get("/lookup/:slug", lookupSlug);

router.use(requireAuth, requireRole("cashier", "manager"));

router.get("/", listTables);
router.post("/", requireRole("manager"), createTable);
router.patch("/:id", updateTable);
router.delete("/:id", requireRole("manager"), deleteTable);
router.post("/merge", mergeTables);
router.patch("/sessions/:id/split", splitSession);
router.patch("/sessions/:id/assign", assignStaff);
router.patch("/sessions/:id/close", closeSession);

module.exports = router;
