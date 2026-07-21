const express = require("express");
const cors = require("cors");

const { isOriginAllowed } = require("./config/corsOrigins");
const { router: uploadRoutes } = require("./routes/uploadRoutes");

const menuRoutes = require("./routes/menuRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const ingredientRoutes = require("./routes/ingredientRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const printRoutes = require("./routes/printRoutes");
const tableRoutes = require("./routes/tableRoutes");
const staffRoutes = require("./routes/staffRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/uploads", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/print-jobs", printRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
