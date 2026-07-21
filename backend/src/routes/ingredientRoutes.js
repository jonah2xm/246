const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listIngredients,
  createIngredient,
  updateIngredient,
  adjustStock,
  deleteIngredient,
} = require("../controllers/ingredientController");

const router = express.Router();

router.use(requireAuth, requireRole("manager"));

router.get("/", listIngredients);
router.post("/", createIngredient);
router.patch("/:id/adjust", adjustStock);
router.patch("/:id", updateIngredient);
router.delete("/:id", deleteIngredient);

module.exports = router;
