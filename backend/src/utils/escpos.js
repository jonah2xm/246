// Minimal ESC/POS receipt builder — plain text + a handful of control codes,
// enough for a 58/80mm thermal printer. No external library needed.
const ESC = "\x1B";
const GS = "\x1D";

const INIT = `${ESC}@`;
const ALIGN_CENTER = `${ESC}a\x01`;
const ALIGN_LEFT = `${ESC}a\x00`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const DOUBLE_SIZE = `${GS}!\x11`;
const NORMAL_SIZE = `${GS}!\x00`;
const CUT = `${GS}V\x00`;
const LINE = "--------------------------------\n";

function money(n) {
  return `${n} DA`;
}

function buildReceiptText(order) {
  const lines = [];
  lines.push(INIT, ALIGN_CENTER, DOUBLE_SIZE, BOLD_ON, "246\n", NORMAL_SIZE, BOLD_OFF);
  lines.push(`Ticket #${order.orderNumber}\n`);
  lines.push(`${new Date(order.createdAt).toLocaleString("fr-FR")}\n`);
  lines.push(ALIGN_LEFT, LINE);

  for (const it of order.items) {
    lines.push(`${it.qty}x ${it.name} (${it.sizeLabel})`.padEnd(24) + money(it.unitPrice * it.qty) + "\n");
    for (const sel of it.comboSelections || []) {
      lines.push(`   - ${sel.name} (${sel.sizeLabel})\n`);
    }
    if (it.supplements && it.supplements.length) {
      lines.push(`   + ${it.supplements.join(", ")}\n`);
    }
  }

  lines.push(LINE);
  lines.push(BOLD_ON, `TOTAL`.padEnd(24) + money(order.total) + "\n", BOLD_OFF);
  lines.push(
    `Paiement: ${order.payment.method === "cash" ? "Especes" : "TPE"} (${
      order.payment.status === "paid" ? "PAYE" : "EN ATTENTE"
    })\n`
  );
  lines.push(LINE);
  lines.push(ALIGN_CENTER, "Merci et a bientot !\n\n\n");
  lines.push(CUT);

  return lines.join("");
}

function buildReceiptBuffer(order) {
  return Buffer.from(buildReceiptText(order), "latin1");
}

module.exports = { buildReceiptBuffer, buildReceiptText };
