const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { isOriginAllowed } = require("./config/corsOrigins");

let io = null;

// Rooms:
//   staff        — authenticated staff (KDS, cashier, admin): order + menu events
//   order:{id}   — a customer watching one order's status
// menu:updated is broadcast to everyone (customer menus refetch).
function initIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isOriginAllowed(origin)) callback(null, true);
        else callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PATCH"],
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.staff = { id: payload.id, role: payload.role };
        socket.join("staff");
      } catch {
        // invalid token → connected but not in staff room
      }
    }

    socket.on("order:watch", (orderId) => {
      if (typeof orderId === "string" && /^[a-f0-9]{24}$/i.test(orderId)) {
        socket.join(`order:${orderId}`);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initIO, getIO };
