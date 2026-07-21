const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const comboConfigSchema = new mongoose.Schema(
  {
    picks: { type: Number, required: true },
    eligibleCategoryKeys: { type: [String], required: true },
  },
  { _id: false }
);

// What one unit of this item consumes from ingredient stock.
const recipeEntrySchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema({
  categoryKey: { type: String, required: true, index: true },
  itemOrder: { type: Number, default: 0 },
  name: { type: String, required: true },
  desc: { type: String, default: "" },
  photo: { type: String, default: "" },
  badge: { type: String, default: null },
  highlight: { type: Boolean, default: false },
  sizes: { type: [sizeSchema], required: true },
  available: { type: Boolean, default: true }, // manual flag; effective availability also requires ingredient stock
  station: { type: String, default: "grill" }, // "grill" | "pizza"
  comboConfig: { type: comboConfigSchema, default: null },
  recipe: { type: [recipeEntrySchema], default: [] },
});

module.exports = mongoose.model("MenuItem", menuItemSchema);
