const mongoose = require("mongoose");

const ROLES = ["cashier", "kitchen", "manager"];

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
module.exports.ROLES = ROLES;
