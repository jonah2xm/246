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

// Kitchen station per category — drives KDS station filtering.
const STATION_BY_CATEGORY = {
  burgers: "grill",
  paninis: "grill",
  extras: "grill",
  classic: "pizza",
  signature: "pizza",
  xxl: "pizza",
};

const categories = [
  {
    key: "burgers",
    label: "Burgers",
    items: [
      { name: "BIG BARBECUE", desc: "1 steak de 100gr, fromage, sauce barbecue", photo: "/photos/big-barbecue.jpg", sizes: [{ label: "Prix", price: 400 }] },
      { name: "BIG FAMOUS", desc: "1 steak de 100gr, fromage, sauce boursin", photo: "/photos/big-famous.jpg", sizes: [{ label: "Prix", price: 400 }] },
      { name: "BIG CHEESE", desc: "1 steak de 100gr, gruyère, sauce fromagère", photo: "/photos/big-cheese.jpg", sizes: [{ label: "Prix", price: 400 }] },
      { name: "MIXTE", desc: "1 steak & 1 poulet haché, fromage, sauce fromagère", photo: "/photos/mixte.jpg", sizes: [{ label: "Prix", price: 400 }] },
      { name: "MUSH", desc: "2 steaks, champignon, oeuf, fromage, oignon grillé", photo: "/photos/mush.jpg", sizes: [{ label: "Prix", price: 450 }] },
      { name: "THE CHEESE", desc: "Steak ou poulet haché, fromage", photo: "/photos/the-cheese.jpg", sizes: [{ label: "Simple", price: 250 }, { label: "Double", price: 350 }] },
      { name: "HUMMER", desc: "Steaks, fromage, jambon de dinde", photo: "/photos/hummer.jpg", sizes: [{ label: "H1", price: 400 }, { label: "H2", price: 550 }] },
    ],
  },
  {
    key: "paninis",
    label: "Paninis",
    items: [
      { name: "BEEF BOURSIN", desc: "Steaks, sauce boursin, fromage", photo: "/photos/beef-boursin.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "CHIK'N BOURSIN", desc: "Escalope, sauce boursin, fromage", photo: "/photos/chikn-boursin.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "X FIVE", desc: "5 steaks, jambon de dinde, fromage", photo: "/photos/x-five.jpg", sizes: [{ label: "Prix", price: 750 }] },
      { name: "TANDOORI", desc: "Poulet tandoori, fromage", photo: "/photos/tandoori.jpg", sizes: [{ label: "Prix", price: 550 }] },
      { name: "CURRY", desc: "Poulet curry, fromage", photo: "/photos/curry.jpg", sizes: [{ label: "Prix", price: 550 }] },
      { name: "CLASSIC", desc: "Escalope de poulet, fromage", photo: "/photos/classic-panini.jpg", sizes: [{ label: "Prix", price: 450 }] },
      { name: "FAJITAS", desc: "Poulet, épices, fromage", photo: "/photos/fajitas.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "SAVOYARD", desc: "Poulet, boursin, emmental, jambon de dinde", photo: "/photos/savoyard.jpg", sizes: [{ label: "Prix", price: 650 }] },
      { name: "FUSION", desc: "Poulet tandoori/curry, fromage", photo: "/photos/fusion.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "BUFFALO", desc: "2 steaks, escalope, jambon de dinde, fromage", photo: "/photos/buffalo.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "EMMENTAL", desc: "Poulet, sauce emmental, fromage", photo: "/photos/emmental.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "TRIPLE X", desc: "3 steaks, jambon de dinde, fromage", photo: "/photos/triple-x.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "PERFECTO", desc: "Escalope, champignon, crème fraîche, fromage", photo: "/photos/perfecto.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "TRADITIONNEL", desc: "2 steaks ou 2 poulets hachés, fromage, oeuf", photo: "/photos/traditionnel.jpg", sizes: [{ label: "Prix", price: 450 }] },
      { name: "VOLCANO", desc: "Poulet, épices piquantes, olives, fromage", photo: "/photos/volcano.jpg", sizes: [{ label: "Prix", price: 600 }] },
      { name: "THAÏ", desc: "Poulet, épices & soja, champignon, fromage", photo: "/photos/thai.jpg", sizes: [{ label: "Prix", price: 600 }] },
    ],
  },
  {
    key: "extras",
    label: "Extras",
    items: [
      { name: "CROQUE FROMAGE", desc: "Croque monsieur, fromage fondant", sizes: [{ label: "Prix", price: 300 }] },
      { name: "CROQUE AU CHOIX", desc: "Croque monsieur garni au choix", sizes: [{ label: "Prix", price: 500 }] },
      { name: "SALADE AU CHOIX", desc: "Fromage, thon ou poulet", sizes: [{ label: "Prix", price: 300 }] },
    ],
  },
  {
    key: "classic",
    label: "Classic",
    items: [
      { name: "MARGHERITA", desc: "Sauce tomate, fromage, olives", badge: "100% CHEDDAR MOZZARELLA", sizes: [{ label: "L", price: 400 }, { label: "XL", price: 800 }] },
      { name: "VÉGÉTARIENNE", desc: "Sauce tomate, fromage, tomate, poivron, oignon, champignon, olives", sizes: [{ label: "L", price: 550 }, { label: "XL", price: 1100 }] },
      { name: "OCÉANE", desc: "Sauce tomate, fromage, thon, olives", sizes: [{ label: "L", price: 600 }, { label: "XL", price: 1200 }] },
      { name: "CAMPIONE", desc: "Sauce tomate, fromage, viande hachée", sizes: [{ label: "L", price: 600 }, { label: "XL", price: 1200 }] },
      { name: "POULET", desc: "Sauce tomate, fromage, poulet, olives", sizes: [{ label: "L", price: 600 }, { label: "XL", price: 1200 }] },
      { name: "REINE", desc: "Sauce tomate, fromage, jambon de dinde, champignon", sizes: [{ label: "L", price: 700 }, { label: "XL", price: 1400 }] },
      { name: "CHICKEN", desc: "Sauce tomate, fromage, poulet curry/tandoori, poivron", sizes: [{ label: "L", price: 700 }, { label: "XL", price: 1400 }] },
      { name: "MEAT", desc: "Sauce tomate, jambon de dinde, fromage, viande hachée, poivron", sizes: [{ label: "L", price: 700 }, { label: "XL", price: 1400 }] },
      { name: "ORIENTALE", desc: "Sauce tomate, fromage, merguez, champignon, oeuf", highlight: true, sizes: [{ label: "L", price: 750 }, { label: "XL", price: 1500 }] },
    ],
  },
  {
    key: "signature",
    label: "Signature",
    items: [
      { name: "TEXANE", desc: "Sauce tomate, fromage, merguez, viande hachée, poivron", highlight: true, sizes: [{ label: "L", price: 800 }, { label: "XL", price: 1600 }] },
      { name: "4 FROMAGES", desc: "Sauce tomate, cheddar, gouda, gruyère, camembert ou roquefort", sizes: [{ label: "L", price: 750 }, { label: "XL", price: 1500 }] },
      { name: "FUMÉE", desc: "Crème fraîche, fromage fumé, poulet fumé", sizes: [{ label: "L", price: 750 }, { label: "XL", price: 1500 }] },
      { name: "MEXICAINE", desc: "Sauce piquante, fromage, poivron, viande hachée ou poulet", sizes: [{ label: "L", price: 750 }, { label: "XL", price: 1500 }] },
      { name: "HAWAÏENNE", desc: "Sauce blanche, fromage, poulet, ananas", sizes: [{ label: "L", price: 850 }, { label: "XL", price: 1700 }] },
      { name: "ROYALE", desc: "Sauce tomate, fromage, merguez, viande hachée, poulet, oignon, olives", sizes: [{ label: "L", price: 900 }, { label: "XL", price: 1700 }] },
      { name: "FRUITS DE MER", desc: "Sauce tomate, fromage, fruits de mer, olives", sizes: [{ label: "L", price: 950 }, { label: "XL", price: 1900 }] },
      { name: "CHÈVRE MIEL", desc: "Sauce blanche, fromage de chèvre, miel", sizes: [{ label: "L", price: 950 }, { label: "XL", price: 1900 }] },
      { name: "2.4.6", desc: "Crème fraîche, fromage, poulet, viande hachée, merguez, oignon", sizes: [{ label: "L", price: 950 }, { label: "XL", price: 1900 }] },
    ],
  },
  {
    key: "xxl",
    label: "XXL",
    items: [
      {
        name: "PIZZA XXL",
        desc: "Choisissez 2 pizzas au choix parmi la carte",
        sizes: [{ label: "2 Choix", price: 1800 }],
        comboConfig: { picks: 2, eligibleCategoryKeys: ["classic", "signature"] },
      },
      {
        name: "PIZZA XXL",
        desc: "Choisissez 4 pizzas au choix parmi la carte",
        sizes: [{ label: "4 Choix", price: 2300 }],
        comboConfig: { picks: 4, eligibleCategoryKeys: ["classic", "signature"] },
      },
    ],
  },
];

const supplements = [
  { key: "viande", label: "Viande au choix", price: 100 },
  { key: "creme", label: "Crème fraîche, légumes", price: 100 },
  { key: "sauce", label: "Base sauce blanche", price: 100 },
];

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

// Raw stock. "Pain panini" is seeded low on purpose to demo the alert.
const ingredientDefs = [
  { name: "Pain burger", unit: "pcs", qty: 40, lowThreshold: 10 },
  { name: "Pain panini", unit: "pcs", qty: 8, lowThreshold: 10 },
  { name: "Steak haché", unit: "pcs", qty: 60, lowThreshold: 15 },
  { name: "Poulet", unit: "portions", qty: 50, lowThreshold: 15 },
  { name: "Fromage", unit: "portions", qty: 80, lowThreshold: 20 },
  { name: "Pâte à pizza", unit: "pcs", qty: 40, lowThreshold: 10 },
  { name: "Sauce tomate", unit: "portions", qty: 45, lowThreshold: 10 },
  { name: "Légumes", unit: "portions", qty: 30, lowThreshold: 10 },
];

const BEEF_PANINIS = new Set(["BEEF BOURSIN", "X FIVE", "TRIPLE X", "BUFFALO", "TRADITIONNEL"]);

function buildRecipe(catKey, item, ing) {
  switch (catKey) {
    case "burgers":
      return [
        { ingredientId: ing["Pain burger"], qty: 1 },
        { ingredientId: ing["Steak haché"], qty: item.name === "MUSH" ? 2 : 1 },
        { ingredientId: ing["Fromage"], qty: 1 },
      ];
    case "paninis":
      return [
        { ingredientId: ing["Pain panini"], qty: 1 },
        { ingredientId: BEEF_PANINIS.has(item.name) ? ing["Steak haché"] : ing["Poulet"], qty: 1 },
        { ingredientId: ing["Fromage"], qty: 1 },
      ];
    case "extras":
      return [{ ingredientId: ing["Fromage"], qty: 1 }];
    case "classic":
    case "signature": {
      const recipe = [
        { ingredientId: ing["Pâte à pizza"], qty: 1 },
        { ingredientId: ing["Sauce tomate"], qty: 1 },
        { ingredientId: ing["Fromage"], qty: 1 },
      ];
      if (item.name === "VÉGÉTARIENNE") recipe.push({ ingredientId: ing["Légumes"], qty: 1 });
      return recipe;
    }
    case "xxl": {
      const picks = item.comboConfig ? item.comboConfig.picks : 2;
      return [
        { ingredientId: ing["Pâte à pizza"], qty: picks },
        { ingredientId: ing["Sauce tomate"], qty: picks },
        { ingredientId: ing["Fromage"], qty: picks },
      ];
    }
    default:
      return [];
  }
}

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
    categories.map((cat, idx) => ({ key: cat.key, label: cat.label, order: idx }))
  );

  const ingredientDocs = await Ingredient.insertMany(ingredientDefs);
  const ing = Object.fromEntries(ingredientDocs.map((i) => [i.name, i._id]));

  const docs = [];
  categories.forEach((cat, catIdx) => {
    cat.items.forEach((item, itemIdx) => {
      docs.push({
        categoryKey: cat.key,
        itemOrder: catIdx * 100 + itemIdx,
        name: item.name,
        desc: item.desc,
        photo: item.photo || "",
        badge: item.badge || null,
        highlight: !!item.highlight,
        sizes: item.sizes,
        available: true,
        station: STATION_BY_CATEGORY[cat.key] || "grill",
        comboConfig: item.comboConfig || null,
        recipe: buildRecipe(cat.key, item, ing),
      });
    });
  });

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
