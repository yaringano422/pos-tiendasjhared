import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  RefreshCcw,
  Calendar,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { reportsApi } from "../services/api"; // Importación correcta
import toast from "react-hot-toast";

// Interfaces para mantener el tipado fuerte
interface DashboardKPIs {
  salesToday: number;
  purchasesToday: number;
  lowStock: number;
}

interface TopProduct {
  quantity: number;
  products: {
    name: string;
  };
}

export default function ReportsPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Llamadas en paralelo usando el service unificado
      const [kpisRes, topRes] = await Promise.all([
        reportsApi.getSummary(),
        reportsApi.getTopSelling(),
      ]);

      setKpis(kpisRes.data);
      setTopProducts(topRes.data);
    } catch (error: any) {
      toast.error("Error al sincronizar datos del servidor");
      console.error("Error cargando reportes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n: number) =>
    `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-500 mb-4"></div>
        <p className="text-gray-400 animate-pulse">
          Generando balance de Tiendas JHARED...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-brand-400" /> Centro de Reportes
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Resumen operativo basado en los movimientos de hoy.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white text-sm font-medium rounded-xl border border-dark-700 transition-all shadow-lg"
        >
          <RefreshCcw size={16} />
          Sincronizar
        </button>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ingresos Hoy */}
        <div className="bg-dark-800 border border-dark-700 p-6 rounded-2xl relative overflow-hidden group shadow-xl">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all text-white">
            <DollarSign size={80} />
          </div>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
            Ingresos Hoy
          </p>
          <h2 className="text-3xl font-black text-white mt-2">
            {formatCurrency(kpis?.salesToday || 0)}
          </h2>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            <TrendingUp size={14} className="mr-1 text-emerald-400" />
            <span>Flujo de caja activo</span>
          </div>
        </div>

        {/* Compras Hoy */}
        <div className="bg-dark-800 border border-dark-700 border-l-4 border-l-amber-500 p-6 rounded-2xl shadow-xl">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            Inversión / Compras
          </p>
          <h2 className="text-3xl font-black text-white mt-2">
            {formatCurrency(kpis?.purchasesToday || 0)}
          </h2>
          <p className="text-xs text-gray-500 mt-4 italic">
            Egreso registrado en facturas
          </p>
        </div>

        {/* Alertas Stock */}
        <div
          className={`bg-dark-800 border border-dark-700 border-l-4 p-6 rounded-2xl shadow-xl ${kpis?.lowStock! > 0 ? "border-l-red-500" : "border-l-blue-500"}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Alertas de Stock
              </p>
              <h2 className="text-3xl font-black text-white mt-2">
                {kpis?.lowStock}{" "}
                <span className="text-sm font-normal text-gray-500">
                  productos
                </span>
              </h2>
            </div>
            <div
              className={`p-3 rounded-lg ${kpis?.lowStock! > 0 ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}
            >
              <Package size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Umbral actual: menor a 5 unidades
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranking Productos */}
        <div className="bg-dark-800 border border-dark-700 p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="text-brand-400" size={20} />
              Más Vendidos
            </h3>
            <span className="text-[10px] bg-dark-700 text-gray-400 px-2 py-1 rounded uppercase">
              Ranking Global
            </span>
          </div>

          <div className="space-y-4">
            {topProducts.length > 0 ? (
              topProducts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-gray-700 group-hover:text-brand-500 transition-colors">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm font-semibold text-white">
                      {item.products.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 bg-dark-900 px-3 py-1 rounded-full border border-dark-700">
                      {item.quantity} vendidos
                    </span>
                    <ChevronRight size={14} className="text-gray-600" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 text-sm italic">
                No hay movimientos suficientes para el ranking.
              </div>
            )}
          </div>
        </div>

        {/* Utilidad y Acción Rápida */}
        <div className="flex flex-col gap-6">
          <div className="bg-dark-800 border border-dark-700 p-8 rounded-2xl bg-gradient-to-br from-brand-500/5 to-transparent">
            <h3 className="text-lg font-bold text-white mb-2">
              Utilidad Estimada
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Margen bruto basado en ventas vs costos de hoy.
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-brand-400">
                {formatCurrency(
                  kpis ? kpis.salesToday - kpis.purchasesToday : 0,
                )}
              </span>
              <span className="text-xs text-emerald-500 font-bold mb-2">
                En tiempo real
              </span>
            </div>
          </div>

          <div className="bg-dark-800 border-2 border-dashed border-dark-700 p-6 rounded-2xl flex flex-col items-center justify-center text-center group cursor-pointer hover:border-brand-500 transition-all">
            <Calendar className="text-gray-500 group-hover:text-brand-500 mb-2 transition-colors" />
            <p className="text-sm font-bold text-white">
              Generar Reporte Mensual
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Exportar análisis avanzado de Tiendas JHARED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
