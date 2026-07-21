const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "queue-2026-07-20"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
