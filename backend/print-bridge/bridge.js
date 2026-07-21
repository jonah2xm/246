// Standalone process for the counter PC. Polls the API for queued print
// jobs and writes ESC/POS bytes to a USB thermal printer.
//
// Run separately from the API (`node print-bridge/bridge.js`), typically as
// a background service on the machine physically wired to the printer —
// this is what a USB (not network) printer requires: the API server can't
// reach the USB port directly, so this bridge is the thing that can.
//
// USB_PRINTER_PATH points at the printer's OS device path, e.g.:
//   Windows: \\.\USB001  (or the shared printer name)
//   Linux:   /dev/usb/lp0
// If unset, jobs are logged instead of written to a device — useful for
// development without physical hardware.
require("dotenv").config();
const fs = require("fs");

const API_URL = process.env.API_URL || "http://localhost:5000/api";
const BRIDGE_KEY = process.env.PRINT_BRIDGE_KEY;
const USB_PRINTER_PATH = process.env.USB_PRINTER_PATH || "";
const POLL_INTERVAL_MS = Number(process.env.PRINT_POLL_INTERVAL_MS || 3000);

if (!BRIDGE_KEY) {
  console.error("PRINT_BRIDGE_KEY is not set — refusing to start.");
  process.exit(1);
}

async function fetchQueued() {
  const res = await fetch(`${API_URL}/print-jobs/queued`, {
    headers: { "x-bridge-key": BRIDGE_KEY },
  });
  if (!res.ok) throw new Error(`Failed to fetch queued jobs: ${res.status}`);
  return res.json();
}

async function markJob(id, status, error) {
  await fetch(`${API_URL}/print-jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-bridge-key": BRIDGE_KEY },
    body: JSON.stringify({ status, error }),
  });
}

function writeToPrinter(buffer) {
  if (!USB_PRINTER_PATH) {
    console.log("[print-bridge] USB_PRINTER_PATH not set — would print:");
    console.log(buffer.toString("latin1").replace(/\x1B|\x1D/g, ""));
    return;
  }
  fs.writeFileSync(USB_PRINTER_PATH, buffer);
}

async function tick() {
  try {
    const jobs = await fetchQueued();
    for (const job of jobs) {
      try {
        writeToPrinter(Buffer.from(job.payloadBase64, "base64"));
        await markJob(job.id, "printed");
        console.log(`[print-bridge] printed job ${job.id} (order ${job.orderId})`);
      } catch (err) {
        await markJob(job.id, "failed", err.message);
        console.error(`[print-bridge] failed job ${job.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[print-bridge] poll error:", err.message);
  }
}

console.log(`[print-bridge] polling ${API_URL} every ${POLL_INTERVAL_MS}ms`);
setInterval(tick, POLL_INTERVAL_MS);
tick();
