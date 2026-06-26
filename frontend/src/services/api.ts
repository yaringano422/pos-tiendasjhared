import api from "../api/client";
import type {
  User,
  Product,
  Sale,
  DashboardSummary,
  Customer,
  ApiResponse,
} from "../types";

export interface AuthResponse {
  user: User;
  token: string;
}

/* =========================================================
   HELPERS
========================================================= */

const ensureArray = <T>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export const authApi = {
  login: async (credentials: any): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    return response.data;
  },

  register: async (userData: any): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      userData,
    );
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>("/auth/me");
    return response.data.data;
  },
};

/* =========================================================
   INVENTORY
========================================================= */

export const inventoryApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>("/inventory");
    return ensureArray<Product>(response.data.data);
  },

  search: async (term: string): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>(
      "/inventory/search",
      { params: { q: term } },
    );
    return ensureArray<Product>(response.data.data); // Corregido para acceder a response.data.data
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>("/inventory", data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<Product>): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(
      `/inventory/${id}`,
      data,
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },

  getProviders: async () => {
    const response = await api.get("/inventory/providers");
    return response.data;
  },
  getFilters: async () => {
    const response = await api.get("/inventory/filters");
    return response.data;
  },
  bulkImport: async (data: { products: any[] }) => {
    const response = await api.post("/inventory/bulk-import", data);
    return response.data;
  },
};

/* =========================================================
   SALES
========================================================= */

export const salesApi = {
  create: (saleData: any) => api.post<Sale>("/sales", saleData),

  getHistory: async (params: any = {}): Promise<Sale[]> => {
    const response = await api.get("/sales/history", { params });
    return response.data.data || [];
  },

  getAudit: async (): Promise<any[]> => {
    const response = await api.get("/sales/audit");
    return ensureArray<any>(response.data);
  },

  cancel: async (id: number, data: { reason: string }): Promise<any> => {
    const response = await api.post(`/sales/${id}/cancel`, data);
    return response.data;
  },

  return: async (id: number, data: { reason: string }): Promise<any> => {
    const response = await api.post(`/sales/${id}/return`, data);
    return response.data;
  },
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get("/sales/dashboard-summary");
    return response.data.data || response.data;
  },
};

/* =========================================================
   CUSTOMERS
========================================================= */

export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get("/customers");
    return ensureArray<Customer>(response.data);
  },

  getByName: async (name: string): Promise<Customer | null> => {
    const response = await api.get(`/customers/${name}`);
    return response.data ?? null;
  },

  create: async (data: Partial<Customer>): Promise<Customer> => {
    const response = await api.post<Customer>("/customers", data);
    return response.data;
  },

  update: async (id: number, data: Partial<Customer>): Promise<Customer> => {
    const response = await api.put<Customer>(`/customers/${id}`, data);
    return response.data;
  },
};

/* =========================================================
   PURCHASES
========================================================= */

export const purchasesApi = {
  create: (data: any) => api.post("/purchases", data),

  getHistory: async (month?: number, year?: number): Promise<any[]> => {
    const response = await api.get("/purchases/history", {
      params: { month, year },
    });
    return ensureArray<any>(response.data);
  },
};

/* =========================================================
   REPORTS
========================================================= */

export const reportsApi = {
  getSummary: async (): Promise<DashboardSummary | null> => {
    const response = await api.get("/reports/summary");
    return response.data ?? null;
  },

  getTopSelling: async (): Promise<any[]> => {
    const response = await api.get("/reports/top-selling");
    return ensureArray<any>(response.data);
  },

  getProfit: async (start: string, end: string): Promise<any> => {
    const response = await api.get("/reports/profit", {
      params: { start, end },
    });
    return response.data;
  },
};

/* =========================================================
   AUDIT
========================================================= */

export const auditApi = {
  getLogs: async (): Promise<any[]> => {
    const response = await api.get("/audit/logs");
    return ensureArray<any>(response.data);
  },

  voidSale: (saleId: string | number, reason: string) =>
    api.post(`/audit/void/${saleId}`, {
      reason,
      user_id: 1,
    }),

  processReturn: (saleId: string | number, items: any[]) =>
    api.post(`/audit/return/${saleId}`, {
      items,
      user_id: 1,
    }),
};

/* =========================================================
   USERS
========================================================= */

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get("/users");
    return ensureArray<User>(response.data);
  },

  create: async (data: Partial<User>): Promise<User> => {
    const response = await api.post<User>("/users", data);
    return response.data;
  },

  update: async (id: string | number, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string | number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
