// ============================================
// Core Types for TiendasJhared POS (Cellphones & Tech)
// ============================================

import { SelectedVariant } from "@/store/cartStore";

// --- AUTH & USERS ---
export type UserRole = "admin" | "cajero" | "almacen" | "user" | "vendedor";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}

// --- INVENTORY & PRODUCTS ---
export interface Provider {
  id: number;
  name: string;
  contact_info?: string;
}

export interface Product {
  id: number;
  name: string;
  brand?: string | null;
  category?: string | null;
  price: number; // Precio Venta Normal
  price_major: number; // Precio Mayorista
  cost_buy: number; // Precio de Costo (para utilidad)
  stock: number; // stock total inicial
  stock_actual: number; // stock el inventario real
  stock_sold: number;
  is_active: boolean;
  date_added?: string;
  sale_percentage?: number;
  // Relations
  provider_id?: number | null;
  providers?: {
    name: string;
  };

  // Codes
  qr_code?: string | null;
  barcode?: string | null;

  // Audit
  user_id?: string | number | null;
  image_url?: string | null;
}
export interface InsertProductInput {
  name: string;

  brand?: string | null;
  category?: string | null;

  price: number;
  cost_buy: number;
  price_major?: number;

  stock?: number;
  stock_actual: number;
  stock_sold?: number;

  is_active?: boolean;

  sale_percentage?: number;

  provider_id?: number | null;

  qr_code?: string | null;
  barcode?: string | null;

  user_id?: string | number | null;
}
// --- API RESPONSES ---
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// --- SALES ---
export type PaymentMethod =
  | "efectivo"
  | "tarjeta"
  | "yape"
  | "plin"
  | "transferencia"
  | "mixto";
export type PriceMode = "menor" | "mayorista" | "personalizado";

export interface Customer {
  id: number;
  name: string;
  document_id?: string; // DNI/RUC
  phone?: string;
  created_at: string;
  email?: string;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  quantity: number;
  price: number; // Precio al que se vendió
  subtotal: number;
  products?: { name: string }; // Para historial
}

export interface Sale {
  id: number;

  product_id?: number;

  user_id?: number;

  customer_id?: number;

  quantity?: number;

  total?: number;

  total_price?: number;

  metodo_pago?: PaymentMethod | string;

  status?: string;

  pago_efectivo?: number;

  pago_tarjeta?: number;

  comision_tarjeta?: number;

  date: string;

  customers?: {
    name: string;
  };

  users?: {
    username: string;
  };

  items?: SaleItem[];
  sales_items?: SaleItem[];
}

// --- PURCHASES (Entradas de Mercadería) ---
export interface PurchaseDetail {
  id?: number;
  purchase_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Purchase {
  id: number;
  provider_id: number;
  document_type: string; // Factura/Boleta
  document_number: string;
  subtotal: number;
  igv: number;
  total: number;
  payment_type: string;
  date_issue: string;
  providers?: { name: string };
}

// --- MOVEMENTS & AUDIT ---
export interface CashMovement {
  id: number;
  type: "ingreso" | "egreso";
  amount: number;
  description: string;
  method: PaymentMethod;
  user_id: number;
  created_at: string;
}

export interface SaleAudit {
  id: number;
  sale_id: number;
  action: string;
  reason: string;
  performed_by: number;
  performed_at: string;
  users?: { username: string };
}

// --- UI & STATE MANAGEMENT ---
export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  modo_precio: PriceMode;
  stock_disponible: number;
  notes?: string;
  variants?: SelectedVariant[];
}

export interface DashboardSummary {
  salesToday: number; // Suma total_price del día
  productsSold: number; // Cantidad total unidades vendidas
  newCustomers: number; // Clientes únicos excluyendo Público General
  totalInventory: number; // Sumatoria física de stock_actual
  lowStock: number; // Alertas críticas de stock < 5
  profit?: number;
  timestamp: string;
  purchasesToday?: number; // Total de compras del día
  topSellingProducts?: {
    name: string;
    quantity: number;
  }[];
}

// --- AUTH STATE (Zustand/Store) ---
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
// types/index.ts

export interface AuditLog {
  id: number;
  sale_id: number;
  action: string;
  reason: string;
  performed_by: number;
  performed_at: string;
  users: {
    username: string;
  };
  sales: {
    id: number;
    total_price: number; // Nombre real en DB
    status: string;
    metodo_pago: string;
    total?: number; // Alias para compatibilidad
  };
  status?: string;
}
