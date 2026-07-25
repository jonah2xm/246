require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const MenuItem = require("../src/models/MenuItem");
const Category = require("../src/models/Category");
const Ingredient = require("../src/models/Ingredient");
const Supplement = require("../src/models/Supplement");
const Staff = require("../src/models/Staff");
const Table = require("../src/models/Table");

// Menu (categories, items, supplements) is sourced from the So Pizz catalog,
// extracted to menuData.json by seed/build-sopizz.js. Item photos live in
// QR_menu/public/photos and POS/public/photos (real So Pizz product shots).
const menuData = require("./menuData.json");

const categories = menuData.categories; // [{ key, label, order }]
const menuItems = menuData.items;       // [{ categoryKey, name, desc, photo, highlight, available, station, sizes, comboConfig }]
const supplements = menuData.supplements; // [{ key, label, price }]

const staffAccounts = [
  { name: "Manager", username: "manager", password: "manager123", role: "manager" },
  { name: "Cuisine", username: "kitchen", password: "kitchen123", role: "kitchen" },
  { name: "Caisse", username: "cashier", password: "cashier123", role: "cashier" },
];

const tableLabels = [
  { label: "T1", x: 0, y: 0 },
  { label: "T2", x: 1, y: 0 },
  { label: "T3", x: 2, y: 0 },
  { label: "T4", x: 0, y: 1 },
  { label: "T5", x: 1, y: 1 },
  { label: "T6", x: 2, y: 1 },
];

// Raw stock for the inventory screens. "Mozzarella" is seeded low on purpose
// to demo the low-stock alert. Items carry no recipe (see below), so stock
// levels are informational and don't gate availability.
const ingredientDefs = [
  { name: "Pâte à pizza", unit: "pcs", qty: 60, lowThreshold: 15 },
  { name: "Sauce tomate", unit: "portions", qty: 50, lowThreshold: 12 },
  { name: "Crème fraîche", unit: "portions", qty: 40, lowThreshold: 10 },
  { name: "Mozzarella", unit: "portions", qty: 9, lowThreshold: 20 },
  { name: "Poulet", unit: "portions", qty: 45, lowThreshold: 15 },
  { name: "Viande hachée", unit: "portions", qty: 40, lowThreshold: 12 },
  { name: "Merguez", unit: "portions", qty: 30, lowThreshold: 10 },
  { name: "Thon", unit: "portions", qty: 25, lowThreshold: 8 },
];

function slugify(label) {
  return `${label.toLowerCase()}-${crypto.randomBytes(3).toString("hex")}`;
}

async function seed() {
  await connectDB();

  await MenuItem.deleteMany({});
  await Category.deleteMany({});
  await Ingredient.deleteMany({});
  await Supplement.deleteMany({});
  await Staff.deleteMany({});
  await Table.deleteMany({});

  const categoryDocs = await Category.insertMany(
    categories.map((cat) => ({ key: cat.key, label: cat.label, order: cat.order }))
  );

  const ingredientDocs = await Ingredient.insertMany(ingredientDefs);

  // Recipes are intentionally empty: the So Pizz catalog doesn't map onto the
  // seeded ingredient list, so effective availability follows the manual
  // `available` flag only (findLackingIngredient returns null with no recipe).
  const docs = menuItems.map((item, idx) => ({
    categoryKey: item.categoryKey,
    itemOrder: idx,
    name: item.name,
    desc: item.desc || "",
    photo: item.photo || "",
    badge: item.badge || null,
    highlight: !!item.highlight,
    sizes: item.sizes,
    available: item.available !== false,
    station: item.station || "grill",
    comboConfig: item.comboConfig || null,
    recipe: [],
  }));

  await MenuItem.insertMany(docs);
  await Supplement.insertMany(supplements);
  console.log(`Seeded ${categoryDocs.length} categories and ${ingredientDocs.length} ingredients.`);

  const staffDocs = await Promise.all(
    staffAccounts.map(async (s) => ({
      name: s.name,
      username: s.username,
      passwordHash: await bcrypt.hash(s.password, 10),
      role: s.role,
    }))
  );
  await Staff.insertMany(staffDocs);

  const tableDocs = await Table.insertMany(
    tableLabels.map((t) => ({
      label: t.label,
      capacity: 4,
      position: { x: t.x, y: t.y },
      qrSlug: slugify(t.label),
    }))
  );

  console.log(`Seeded ${docs.length} menu items and ${supplements.length} supplements.`);
  console.log(`Seeded ${staffDocs.length} staff accounts:`);
  staffAccounts.forEach((s) => console.log(`  - ${s.username} / ${s.password} (${s.role})`));
  console.log(`Seeded ${tableDocs.length} tables:`);
  tableDocs.forEach((t) => console.log(`  - ${t.label} → ?table=${t.qrSlug}`));
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
