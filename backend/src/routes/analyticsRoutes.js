const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { summary, customerHistory } = require("../controllers/analyticsController");

const router = express.Router();

router.use(requireAuth, requireRole("manager"));
router.get("/summary", summary);
router.get("/customers/:phone", customerHistory);

module.exports = router;
