import api from "../api/client";
import type { User, Product, Sale, DashboardSummary, Customer } from "../types";

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    api.post<{ token: string; user: User }>("/auth/login", credentials),
};

export const inventoryApi = {
  getAll: () => api.get<Product[]>("/inventory"),
  create: (data: Partial<Product>) => api.post<Product>("/inventory", data),
  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

export const salesApi = {
  create: (saleData: any) => api.post<Sale>("/sales", saleData),
  getHistory: () => api.get<Sale[]>("/sales/history"),
  getAudit: () => api.get<any[]>("/sales/audit"),
};

export const customersApi = {
  getAll: () => api.get<Customer[]>("/customers"),
  getByName: (name: string) => api.get<Customer>(`/customers/${name}`),
  create: (data: Partial<Customer>) => api.post<Customer>("/customers", data),
  update: (id: number, data: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, data),
};

export const purchasesApi = {
  // Registrar una nueva compra (afecta stock y precio de costo)
  create: (data: any) => api.post("/purchases", data),

  // Obtener historial con nombres de proveedores
  getHistory: (month?: number, year?: number) =>
    api.get("/purchases/history", { params: { month, year } }),
};

export const reportsApi = {
  getSummary: () => api.get<DashboardSummary>("/reports/summary"),
  getTopSelling: () => api.get<any[]>("/reports/top-selling"),
  getProfit: (start: string, end: string) =>
    api.get<any>("/reports/profit", { params: { start, end } }),
};
export const auditApi = {
  getLogs: () => api.get<any[]>("/audit/logs"),

  // Anulación Total
  voidSale: (saleId: string | number, reason: string) =>
    api.post(`/audit/void/${saleId}`, { reason, user_id: 1 }),

  // Devolución Parcial (Nuevo endpoint corregido)
  processReturn: (saleId: string | number, items: any[]) =>
    api.post(`/audit/return/${saleId}`, { items, user_id: 1 }),
};

export const usersApi = {
  getAll: () => api.get<User[]>("/users"),
  create: (data: Partial<User>) => api.post<User>("/users", data),
  update: (id: string | number, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
  delete: (id: string | number) => api.delete(`/users/${id}`),
};
