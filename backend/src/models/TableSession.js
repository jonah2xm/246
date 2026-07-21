const mongoose = require("mongoose");

const tableSessionSchema = new mongoose.Schema(
  {
    tableIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Table", required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TableSession", tableSessionSchema);
