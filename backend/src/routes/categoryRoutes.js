const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { listCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

const router = express.Router();

router.use(requireAuth, requireRole("manager"));

router.get("/", listCategories);
router.post("/", createCategory);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
