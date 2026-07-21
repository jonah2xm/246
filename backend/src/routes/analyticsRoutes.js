const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { summary, tableStats, customerHistory } = require("../controllers/analyticsController");

const router = express.Router();

router.use(requireAuth, requireRole("manager"));
router.get("/summary", summary);
router.get("/tables", tableStats);
router.get("/customers/:phone", customerHistory);

module.exports = router;
