// Shared between the Express REST API and the Socket.io server so both
// enforce the exact same origin allowlist — one env var, one source of truth.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  // No Origin header = same-origin request, curl, server-to-server, the
  // print bridge, etc. — always allowed, nothing to check against.
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Local dev on any port, both apps run side by side.
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

module.exports = { allowedOrigins, isOriginAllowed };
