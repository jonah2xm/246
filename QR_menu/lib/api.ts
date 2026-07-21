import { CartItem, MenuResponse, OrderMode, PaymentMethod, PlaceOrderOptions, PlaceOrderResult } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function getMenu(): Promise<MenuResponse> {
  const res = await fetch(`${API_URL}/menu`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

export async function placeOrder(
  mode: OrderMode,
  items: CartItem[],
  paymentMethod: PaymentMethod,
  options: PlaceOrderOptions = {}
): Promise<PlaceOrderResult> {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      paymentMethod,
      tableSlug: options.tableSlug || undefined,
      scheduledFor: options.scheduledFor || undefined,
      customerPhone: options.customerPhone || undefined,
      items: items.map((i) => ({
        name: i.name,
        sizeLabel: i.sizeLabel,
        unitPrice: i.unitPrice,
        qty: i.qty,
        supplements: i.supplements,
        comboSelections: i.comboSelections,
      })),
    }),
  });
  if (!res.ok) throw new Error("Failed to place order");
  return res.json();
}

// Validates a ?table= QR slug. Returns null when the table doesn't exist.
export async function lookupTable(slug: string): Promise<{ label: string } | null> {
  const res = await fetch(`${API_URL}/tables/lookup/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Lookup failed");
  return res.json();
}

export async function submitFeedback(orderId: string, rating: number, comment: string): Promise<void> {
  const res = await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, rating, comment }),
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
}
