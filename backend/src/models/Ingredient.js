const mongoose = require("mongoose");

// Raw stock (meat, chicken, cheese, dough…). Menu items consume these
// through their recipe; stock is tracked here, not on menu items.
const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, default: "pcs" }, // pcs, g, kg, portions…
  qty: { type: Number, default: 0 },
  lowThreshold: { type: Number, default: 10 },
});

module.exports = mongoose.model("Ingredient", ingredientSchema);
