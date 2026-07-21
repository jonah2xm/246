const mongoose = require("mongoose");

const REASONS = ["sale", "cancel_refund", "adjustment", "waste"];

const stockMovementSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
    delta: { type: Number, required: true }, // negative = consumed, positive = restock
    reason: { type: String, enum: REASONS, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);
module.exports.REASONS = REASONS;
