const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireBridgeKey } = require("../middleware/bridgeAuth");
const { createPrintJob, listQueued, markPrinted } = require("../controllers/printController");

const router = express.Router();

router.post("/", requireAuth, requireRole("cashier", "manager"), createPrintJob);
router.get("/queued", requireBridgeKey, listQueued);
router.patch("/:id", requireBridgeKey, markPrinted);

module.exports = router;
