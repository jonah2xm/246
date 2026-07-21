const Counter = require("../models/Counter");

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Atomic daily counter — safe under concurrent order creation.
async function nextQueueNumber() {
  const businessDate = todayKey();
  const counter = await Counter.findOneAndUpdate(
    { _id: `queue-${businessDate}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return { queueNumber: counter.seq, businessDate };
}

module.exports = { nextQueueNumber, todayKey };
