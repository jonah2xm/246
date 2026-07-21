// Machine auth for the local print bridge — a shared key, not a staff JWT,
// since the bridge runs unattended on the counter PC.
function requireBridgeKey(req, res, next) {
  const key = req.headers["x-bridge-key"];
  if (!key || key !== process.env.PRINT_BRIDGE_KEY) {
    return res.status(401).json({ error: "Invalid bridge key" });
  }
  next();
}

module.exports = { requireBridgeKey };
