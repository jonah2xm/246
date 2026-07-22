import {
  CategoryAdmin,
  CategoryInfo,
  Ingredient,
  MenuItemInput,
  StaffOrder,
  Staff,
  OrderStatus,
  TableInfo,
  TableSessionInfo,
  StaffMember,
  AnalyticsSummary,
  FeedbackEntry,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<{ token: string; staff: Staff }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Identifiants invalides" }));
    throw new Error(body.error || "Identifiants invalides");
  }
  return res.json();
}

export function getActiveOrders(token: string): Promise<StaffOrder[]> {
  return request("/orders/active", token);
}

export function getTodayOrders(token: string): Promise<StaffOrder[]> {
  return request("/orders/today", token);
}

export function getUnpaidOrders(token: string): Promise<StaffOrder[]> {
  return request("/orders/unpaid", token);
}

export function updateOrderStatus(token: string, id: string, status: OrderStatus): Promise<StaffOrder> {
  return request(`/orders/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function markOrderPaid(token: string, id: string): Promise<StaffOrder> {
  return request(`/orders/${id}/pay`, token, { method: "PATCH" });
}

// Counter order entered by the cashier — same public endpoint the QR menu
// uses, flagged with source: "counter".
export function createCounterOrder(body: {
  items: import("./types").OrderLine[];
  paymentMethod: "cash" | "tpe";
  tableSlug?: string | null;
}): Promise<{ orderId: string; orderNumber: number; total: number }> {
  return request("/orders", null, {
    method: "POST",
    body: JSON.stringify({ ...body, source: "counter", tableSlug: body.tableSlug || undefined }),
  });
}

export function updateOrderItems(token: string, id: string, items: import("./types").OrderLine[]): Promise<StaffOrder> {
  return request(`/orders/${id}/items`, token, { method: "PATCH", body: JSON.stringify({ items }) });
}

export function getMenuAdmin(
  token: string
): Promise<{ categories: CategoryAdmin[]; supplements: { key: string; label: string; price: number }[] }> {
  return request("/menu", token);
}

export function setItemAvailability(token: string, id: string, available: boolean): Promise<{ id: string; manualAvailable: boolean }> {
  return request(`/menu/${id}/availability`, token, {
    method: "PATCH",
    body: JSON.stringify({ available }),
  });
}

export function createMenuItem(token: string, body: MenuItemInput): Promise<{ id: string }> {
  return request("/menu", token, { method: "POST", body: JSON.stringify(body) });
}

export function updateMenuItem(token: string, id: string, body: Partial<MenuItemInput>): Promise<{ id: string }> {
  return request(`/menu/${id}`, token, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteMenuItem(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/menu/${id}`, token, { method: "DELETE" });
}

export function listCategories(token: string): Promise<CategoryInfo[]> {
  return request("/categories", token);
}

export function createCategory(token: string, label: string): Promise<{ id: string; key: string }> {
  return request("/categories", token, { method: "POST", body: JSON.stringify({ label }) });
}

export function updateCategory(token: string, id: string, body: { label?: string; order?: number }): Promise<{ id: string }> {
  return request(`/categories/${id}`, token, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteCategory(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/categories/${id}`, token, { method: "DELETE" });
}

export function listIngredients(token: string): Promise<Ingredient[]> {
  return request("/ingredients", token);
}

export function createIngredient(token: string, body: { name: string; unit: string; qty: number; lowThreshold: number }): Promise<Ingredient> {
  return request("/ingredients", token, { method: "POST", body: JSON.stringify(body) });
}

export function updateIngredient(token: string, id: string, body: { name?: string; unit?: string; lowThreshold?: number }): Promise<Ingredient> {
  return request(`/ingredients/${id}`, token, { method: "PATCH", body: JSON.stringify(body) });
}

export function adjustIngredient(token: string, id: string, delta: number, reason: "adjustment" | "waste"): Promise<Ingredient> {
  return request(`/ingredients/${id}/adjust`, token, { method: "PATCH", body: JSON.stringify({ delta, reason }) });
}

export function deleteIngredient(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/ingredients/${id}`, token, { method: "DELETE" });
}

// Multipart — no JSON content-type header here.
export async function uploadImage(token: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Échec de l'upload" }));
    throw new Error(body.error || "Échec de l'upload");
  }
  return res.json();
}

export function printReceipt(token: string, orderId: string): Promise<{ id: string; status: string }> {
  return request("/print-jobs", token, {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function getTables(token: string): Promise<TableInfo[]> {
  return request("/tables", token);
}

export function createTable(token: string, body: { label: string; capacity: number; position?: { x: number; y: number } }): Promise<TableInfo> {
  return request("/tables", token, { method: "POST", body: JSON.stringify(body) });
}

export function deleteTable(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/tables/${id}`, token, { method: "DELETE" });
}

export function updateTable(
  token: string,
  id: string,
  body: { position?: { x: number; y: number }; label?: string; capacity?: number }
): Promise<TableInfo> {
  return request(`/tables/${id}`, token, { method: "PATCH", body: JSON.stringify(body) });
}

export function assignStaffToSession(token: string, sessionId: string, staffId: string): Promise<TableSessionInfo> {
  return request(`/tables/sessions/${sessionId}/assign`, token, {
    method: "PATCH",
    body: JSON.stringify({ staffId }),
  });
}

export function closeSession(token: string, sessionId: string): Promise<TableSessionInfo> {
  return request(`/tables/sessions/${sessionId}/close`, token, { method: "PATCH" });
}

export function listStaff(token: string): Promise<StaffMember[]> {
  return request("/staff", token);
}

export function getAnalyticsSummary(token: string, date?: string): Promise<AnalyticsSummary> {
  return request(`/analytics/summary${date ? `?date=${date}` : ""}`, token);
}

export function getTableAnalytics(token: string, date?: string): Promise<import("./types").TableAnalytics> {
  return request(`/analytics/tables${date ? `?date=${date}` : ""}`, token);
}

export function getFeedbackList(token: string): Promise<FeedbackEntry[]> {
  return request("/feedback", token);
}
