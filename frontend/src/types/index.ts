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
  brand?: string;
  category?: string;
  price: number; // Precio Venta Normal
  price_major: number; // Precio Mayorista
  cost_buy: number; // Precio de Costo (para utilidad)
  stock_actual: number;
  stock_min?: number;
  provider_id?: number;
  providers?: { name: string }; // Relación para tablas
  barcode?: string;
  qr_code?: string;
  is_active: boolean;
  image_url?: string;
  created_at: string;
}
// Agrega esto a tu archivo de tipos
export interface ApiResponse<T> {
  success: boolean;
  data: T; // Aquí T será Product[]
  message?: string;
}

// --- SALES ---
export type PaymentMethod =
  | "Efectivo"
  | "Tarjeta"
  | "Yape"
  | "Plin"
  | "Transferencia";
export type PriceMode = "normal" | "mayorista" | "personalizado";

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
  product_id?: number; // Para ventas simples
  user_id: number;
  customer_id?: number;
  quantity: number;
  total: number;
  total_price?: number; // Alias para compatibilidad
  metodo_pago: PaymentMethod;
  date: string;
  customers?: { name: string };
  users?: { username: string };
  items?: SaleItem[]; // Si usas tabla detalle
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
  salesToday: number;
  purchasesToday: number;
  lowStock: number;
  profit?: number;
  timestamp: string;
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
  // Eliminamos las propiedades sueltas que causan ruido
  status?: string;
}
