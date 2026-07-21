export interface Size {
  label: string;
  price: number;
}

export interface ComboConfig {
  picks: number;
  eligibleCategoryKeys: string[];
}

export interface ComboSelection {
  name: string;
  sizeLabel: string;
}

export interface MenuItemDTO {
  id: string;
  name: string;
  desc: string;
  photo: string;
  badge: string | null;
  highlight: boolean;
  sizes: Size[];
  available: boolean;
  comboConfig: ComboConfig | null;
}

export interface Category {
  key: string;
  label: string;
  order: number;
  items: MenuItemDTO[];
}

export interface Supplement {
  key: string;
  label: string;
  price: number;
}

export interface MenuResponse {
  categories: Category[];
  supplements: Supplement[];
}

export interface CartItem {
  id: string;
  name: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  supplements: string[];
  comboSelections: ComboSelection[];
}

export type OrderMode = "table" | "delivery";
export type PaymentMethod = "cash" | "tpe";
export type OrderStatus = "new" | "in_progress" | "ready" | "completed" | "cancelled";

export interface PlaceOrderOptions {
  tableSlug?: string | null;
  scheduledFor?: string | null;
  customerPhone?: string | null;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNumber: number;
  total: number;
  paymentMethod: PaymentMethod;
  confirmSubtext: string;
  scheduledFor: string | null;
  loyaltyPoints: { earned: number; balance: number } | null;
}

export interface PublicOrderStatus {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  payment: { method: PaymentMethod; status: "pending" | "paid" };
}
