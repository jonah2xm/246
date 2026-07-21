const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const { getIO } = require("../io");

function slugifyKey(label) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function listCategories(req, res, next) {
  try {
    const categories = await Category.find().sort({ order: 1 });
    const counts = await MenuItem.aggregate([{ $group: { _id: "$categoryKey", count: { $sum: 1 } } }]);
    const countByKey = new Map(counts.map((c) => [c._id, c.count]));
    res.json(
      categories.map((c) => ({
        id: c._id,
        key: c.key,
        label: c.label,
        order: c.order,
        itemCount: countByKey.get(c.key) || 0,
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { label, order } = req.body;
    if (!label || !String(label).trim()) return res.status(400).json({ error: "label requis" });

    const key = slugifyKey(String(label).trim());
    if (!key) return res.status(400).json({ error: "label invalide" });
    if (await Category.findOne({ key })) return res.status(409).json({ error: "Cette catégorie existe déjà" });

    const category = await Category.create({
      key,
      label: String(label).trim(),
      order: typeof order === "number" ? order : await Category.countDocuments(),
    });

    getIO().emit("menu:updated", {});
    res.status(201).json({ id: category._id, key: category.key });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { label, order } = req.body;
    const update = {};
    if (label !== undefined) {
      if (!String(label).trim()) return res.status(400).json({ error: "label invalide" });
      update.label = String(label).trim();
    }
    if (order !== undefined) update.order = order;

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) return res.status(404).json({ error: "Catégorie introuvable" });

    getIO().emit("menu:updated", {});
    res.json({ id: category._id });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Catégorie introuvable" });

    const itemCount = await MenuItem.countDocuments({ categoryKey: category.key });
    if (itemCount > 0) {
      return res.status(409).json({ error: `Impossible: ${itemCount} article(s) dans cette catégorie. Déplacez-les d'abord.` });
    }

    await category.deleteOne();
    getIO().emit("menu:updated", {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
