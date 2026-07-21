const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
});

module.exports = mongoose.model("Category", categorySchema);
