const crypto = require("crypto");
const Table = require("../models/Table");
const TableSession = require("../models/TableSession");
const Staff = require("../models/Staff");
const { getIO } = require("../io");

function slugify(label) {
  const base = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

async function listTables(req, res, next) {
  try {
    const tables = await Table.find().sort({ label: 1 });
    const sessions = await TableSession.find({ status: "open" }).populate("assignedStaffId", "name role");

    const sessionByTableId = new Map();
    sessions.forEach((s) => s.tableIds.forEach((tid) => sessionByTableId.set(String(tid), s)));

    res.json(
      tables.map((t) => {
        const s = sessionByTableId.get(String(t._id));
        return {
          id: t._id,
          label: t.label,
          capacity: t.capacity,
          position: t.position,
          qrSlug: t.qrSlug,
          status: t.status,
          session: s
            ? {
                id: s._id,
                tableIds: s.tableIds,
                openedAt: s.openedAt,
                assignedStaff: s.assignedStaffId
                  ? { id: s.assignedStaffId._id, name: s.assignedStaffId.name }
                  : null,
              }
            : null,
        };
      })
    );
  } catch (err) {
    next(err);
  }
}

async function createTable(req, res, next) {
  try {
    const { label, capacity = 4, position = { x: 0, y: 0 } } = req.body;
    if (!label) return res.status(400).json({ error: "label is required" });

    const table = await Table.create({ label, capacity, position, qrSlug: slugify(label) });
    res.status(201).json(table);
  } catch (err) {
    next(err);
  }
}

async function updateTable(req, res, next) {
  try {
    const { position, label, capacity } = req.body;
    const update = {};
    if (position) update.position = position;
    if (label !== undefined) {
      if (!String(label).trim()) return res.status(400).json({ error: "label invalide" });
      update.label = String(label).trim();
    }
    if (capacity !== undefined) update.capacity = Math.max(1, Number(capacity) || 1);

    const table = await Table.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!table) return res.status(404).json({ error: "Table not found" });

    getIO().to("staff").emit("table:updated", { id: table._id, status: table.status, position: table.position });
    res.json(table);
  } catch (err) {
    next(err);
  }
}

async function deleteTable(req, res, next) {
  try {
    const openSession = await TableSession.exists({ tableIds: req.params.id, status: "open" });
    if (openSession) {
      return res.status(409).json({ error: "Impossible: une session est ouverte sur cette table. Clôturez-la d'abord." });
    }

    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ error: "Table not found" });

    getIO().to("staff").emit("table:deleted", { id: table._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Public: customers hitting ?table=<slug> validate it before ordering.
// Unknown slug → 404 → the menu shows "Table invalide".
async function lookupSlug(req, res, next) {
  try {
    const table = await Table.findOne({ qrSlug: req.params.slug });
    if (!table) return res.status(404).json({ error: "Table invalide" });
    res.json({ label: table.label, capacity: table.capacity });
  } catch (err) {
    next(err);
  }
}

// Combine several free-standing tables under one shared session (for a large group).
async function mergeTables(req, res, next) {
  try {
    const { tableIds } = req.body;
    if (!Array.isArray(tableIds) || tableIds.length < 2) {
      return res.status(400).json({ error: "Provide at least two tableIds to merge" });
    }

    const tables = await Table.find({ _id: { $in: tableIds } });
    if (tables.length !== tableIds.length) return res.status(404).json({ error: "Some tables not found" });

    const existingSessions = await TableSession.find({ tableIds: { $in: tableIds }, status: "open" });
    const keepStaffId = existingSessions.find((s) => s.assignedStaffId)?.assignedStaffId || null;
    await TableSession.updateMany(
      { _id: { $in: existingSessions.map((s) => s._id) } },
      { status: "closed", closedAt: new Date() }
    );

    const session = await TableSession.create({ tableIds, status: "open", assignedStaffId: keepStaffId });
    await Table.updateMany({ _id: { $in: tableIds } }, { status: "occupied" });

    getIO().to("staff").emit("table:merged", { sessionId: session._id, tableIds });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

// Break a merged session back into one independent session per table.
async function splitSession(req, res, next) {
  try {
    const session = await TableSession.findById(req.params.id);
    if (!session || session.status !== "open") {
      return res.status(404).json({ error: "Open session not found" });
    }

    session.status = "closed";
    session.closedAt = new Date();
    await session.save();

    const newSessions = await TableSession.insertMany(
      session.tableIds.map((tableId) => ({ tableIds: [tableId], status: "open" }))
    );

    getIO().to("staff").emit("table:split", { fromSessionId: session._id, tableIds: session.tableIds });
    res.json(newSessions);
  } catch (err) {
    next(err);
  }
}

async function assignStaff(req, res, next) {
  try {
    const { staffId } = req.body;
    const staff = await Staff.findOne({ _id: staffId, active: true });
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    const session = await TableSession.findByIdAndUpdate(
      req.params.id,
      { assignedStaffId: staffId },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    getIO()
      .to("staff")
      .emit("table:assigned", { sessionId: session._id, tableIds: session.tableIds, staff: { id: staff._id, name: staff.name } });
    res.json(session);
  } catch (err) {
    next(err);
  }
}

async function closeSession(req, res, next) {
  try {
    const session = await TableSession.findById(req.params.id);
    if (!session || session.status !== "open") {
      return res.status(404).json({ error: "Open session not found" });
    }

    session.status = "closed";
    session.closedAt = new Date();
    await session.save();
    await Table.updateMany({ _id: { $in: session.tableIds } }, { status: "free" });

    getIO().to("staff").emit("table:closed", { sessionId: session._id, tableIds: session.tableIds });
    res.json(session);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  lookupSlug,
  mergeTables,
  splitSession,
  assignStaff,
  closeSession,
};
