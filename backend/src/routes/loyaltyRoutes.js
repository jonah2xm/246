const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getAccount } = require("../controllers/loyaltyController");

const router = express.Router();

router.get("/:phone", requireAuth, requireRole("cashier", "manager"), getAccount);

module.exports = router;
