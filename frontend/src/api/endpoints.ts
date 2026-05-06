export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
  },
  USERS: {
    LIST: "/users",
    DETAIL: (id: number) => `/users/${id}`,
  },
  INVENTORY: {
    LIST: "/inventory",
    CREATE: "/inventory",
    DETAIL: (id: number) => `/inventory/${id}`,
    UPDATE: (id: number) => `/inventory/${id}`,
    DELETE: (id: number) => `/inventory/${id}`,
  },
  SALES: {
    CREATE: "/sales",
    HISTORY: "/sales/history",
    AUDIT: "/sales/audit",
  },
  PURCHASES: {
    CREATE: "/purchases",
    HISTORY: "/purchases/history",
  },
  REPORTS: {
    SUMMARY: "/reports/summary",
    PROFIT: "/reports/profit",
    TOP_PRODUCTS: "/reports/top-products",
  },
  AUDIT: {
    // Estas rutas coinciden con el AuditController del backend
    LOGS: "/audit/logs",
    VOID: (id: number) => `/audit/void/${id}`,
  },
};
