const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema({
  label: { type: String, required: true },
  capacity: { type: Number, default: 4 },
  position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  qrSlug: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ["free", "occupied", "awaiting_payment", "needs_cleaning"],
    default: "free",
  },
});

module.exports = mongoose.model("Table", tableSchema);
