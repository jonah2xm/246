const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getMenu, createItem, updateItem, deleteItem, setAvailability } = require("../controllers/menuController");

const router = express.Router();

router.get("/", getMenu);
router.post("/", requireAuth, requireRole("manager"), createItem);
router.patch("/:id/availability", requireAuth, requireRole("manager"), setAvailability);
router.patch("/:id", requireAuth, requireRole("manager"), updateItem);
router.delete("/:id", requireAuth, requireRole("manager"), deleteItem);

module.exports = router;
