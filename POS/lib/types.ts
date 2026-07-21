export type Role = "cashier" | "kitchen" | "manager";

export interface Staff {
  id: string;
  name: string;
  role: Role;
}

export type OrderStatus = "new" | "in_progress" | "ready" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "tpe";
export type PaymentStatus = "pending" | "paid";

export interface ComboSelection {
  name: string;
  sizeLabel: string;
}

export interface OrderItem {
  menuItemId: string | null;
  name: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  supplements: string[];
  station: string;
  comboSelections: ComboSelection[];
}

export interface StatusEvent {
  status: OrderStatus;
  at: string;
  byStaffId: string | null;
}

export interface OrderLine {
  name: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  supplements: string[];
  comboSelections: ComboSelection[];
}

export interface StaffOrder {
  id: string;
  orderNumber: number;
  businessDate: string;
  mode: "table" | "delivery";
  source: "qr" | "counter";
  sessionId: string | null;
  table: string | null;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: string | null;
    byStaffId: string | null;
  };
  scheduledFor: string | null;
  customerPhone: string | null;
  createdAt: string;
}

export interface RecipeEntry {
  ingredientId: string;
  qty: number;
}

export interface MenuItemAdmin {
  id: string;
  categoryKey: string;
  name: string;
  desc: string;
  photo: string;
  badge: string | null;
  highlight: boolean;
  sizes: { label: string; price: number }[];
  available: boolean; // effective: manual flag AND ingredient stock
  manualAvailable: boolean;
  inStock: boolean;
  station: string;
  comboConfig: { picks: number; eligibleCategoryKeys: string[] } | null;
  recipe: RecipeEntry[];
}

export interface CategoryAdmin {
  id: string;
  key: string;
  label: string;
  order: number;
  items: MenuItemAdmin[];
}

export interface CategoryInfo {
  id: string;
  key: string;
  label: string;
  order: number;
  itemCount: number;
}

export interface Ingredient {
  _id: string;
  name: string;
  unit: string;
  qty: number;
  lowThreshold: number;
}

export interface MenuItemInput {
  name: string;
  categoryKey: string;
  desc?: string;
  photo?: string;
  badge?: string | null;
  highlight?: boolean;
  sizes: { label: string; price: number }[];
  station?: string;
  recipe?: RecipeEntry[];
}

export interface TableSessionInfo {
  id: string;
  tableIds: string[];
  openedAt: string;
  assignedStaff: { id: string; name: string } | null;
}

export type TableStatus = "free" | "occupied";

export interface TableInfo {
  id: string;
  label: string;
  capacity: number;
  position: { x: number; y: number };
  qrSlug: string;
  status: TableStatus;
  session: TableSessionInfo | null;
}

export interface StaffMember {
  _id: string;
  name: string;
  role: Role;
}

export interface AnalyticsSummary {
  businessDate: string;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  salesByItem: { name: string; qty: number; revenue: number }[];
  salesByHour: { hour: number; orders: number; revenue: number }[];
  peakHour: { hour: number; orders: number; revenue: number } | null;
  popularCombos: { name: string; qty: number }[];
  staffPerformance: {
    staffId: string;
    name: string;
    role: Role;
    ordersCompleted: number;
    paymentsHandled: number;
    revenueCollected: number;
  }[];
}

export interface TableOrderHistoryEntry {
  id: string;
  orderNumber: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  itemCount: number;
  createdAt: string;
}

export interface TableAnalyticsEntry {
  table: string | null;
  label: string;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  orders: TableOrderHistoryEntry[];
}

export interface TableAnalytics {
  businessDate: string;
  tables: TableAnalyticsEntry[];
}

export interface FeedbackEntry {
  _id: string;
  orderId: { _id: string; orderNumber: number; total: number } | null;
  rating: number;
  comment: string;
  createdAt: string;
}
