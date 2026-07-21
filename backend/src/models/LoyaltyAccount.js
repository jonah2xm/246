const mongoose = require("mongoose");

const loyaltyHistorySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    pointsDelta: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const loyaltyAccountSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    history: { type: [loyaltyHistorySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoyaltyAccount", loyaltyAccountSchema);
