require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initIO } = require("./io");

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = http.createServer(app);
    initIO(server);
    server.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
