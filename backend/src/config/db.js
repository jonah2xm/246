const mongoose = require("mongoose");

// The hosted connection string is a secret and lives in backend/.env, which is
// gitignored — never commit it. The fallback is a local dev database so a fresh
// clone still boots without any setup.
//
// The hosted URI needs two params beyond host/credentials:
//   authSource=admin       the `mongo` user lives in admin, not pizza246
//   directConnection=true  the proxy fronts a single node that would otherwise
//                          advertise an unreachable internal hostname
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pizza246";

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  // Log without credentials — this string may carry a password.
  console.log(`MongoDB connected: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//")}`);
}

module.exports = connectDB;
