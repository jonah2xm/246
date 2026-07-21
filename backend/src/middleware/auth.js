const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.staff = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.staff.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
