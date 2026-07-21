const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const { requireAuth, requireRole } = require("../middleware/auth");
const { uploadToR2 } = require("../lib/r2");

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error("Format non supporté (JPEG, PNG ou WebP)"));
    cb(null, true);
  },
});

const router = express.Router();

// Menu item photos, stored in Cloudflare R2. Returns the public URL both
// frontends can use directly (no local disk involved — safe for multi-instance
// deploys where each server wouldn't otherwise share an uploads/ folder).
router.post("/", requireAuth, requireRole("manager"), upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

    const ext = EXT[req.file.mimetype] || ".jpg";
    const key = `menu-items/${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const url = await uploadToR2(key, req.file.buffer, req.file.mimetype);

    res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
});

// Multer errors (size limit, bad format) come through here.
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Échec de l'upload" });
});

module.exports = { router };
