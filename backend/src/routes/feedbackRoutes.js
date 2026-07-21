const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { submitFeedback, listFeedback } = require("../controllers/feedbackController");

const router = express.Router();

router.post("/", submitFeedback);
router.get("/", requireAuth, requireRole("manager"), listFeedback);

module.exports = router;
