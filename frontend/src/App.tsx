import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import MainLayout from "./layouts/MainLayout";

// Páginas del Proyecto Tienda de Celulares
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SalesPage from "./pages/SalesPage";
import InventoryPage from "./pages/InventoryPage";
import CustomersPage from "./pages/CustomersPage";
import PurchasesPage from "./pages/PurchasesPage";
import UsersPage from "./pages/UsersPage";
import ReportsPage from "./pages/ReportsPage";
import POSPage from "./pages/POSPage";
import HistoryPage from "./pages/HistoryPage";
import AuditPage from "./pages/AuditPage";
/**
 * Componente de Ruta Protegida
 * Verifica si el usuario está autenticado antes de permitir el acceso
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-blue-500 text-xl font-semibold">
          Cargando sistema...
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      {/* Configuración de Notificaciones (Toaster) */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#0f172a", // slate-900
            color: "#f8fafc", // slate-50
            border: "1px solid #1e293b",
            borderRadius: "8px",
          },
        }}
      />

      <Routes>
        {/* Ruta Pública */}
        <Route path="/login" element={<LoginPage />} />
        {/* Rutas Privadas con Layout Principal */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirección inicial al Dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Módulos de la Tienda de Celulares */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="purchases" element={<PurchasesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="sales-history" element={<HistoryPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        {/* Captura de rutas no existentes */}
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
