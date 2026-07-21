const mongoose = require("mongoose");

const supplementSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  price: { type: Number, required: true },
});

module.exports = mongoose.model("Supplement", supplementSchema);
