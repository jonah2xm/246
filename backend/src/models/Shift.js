const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shift", shiftSchema);
