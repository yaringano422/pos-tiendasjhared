import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Banknote,
  Utensils,
  Percent,
} from "lucide-react";

// Interfaces para mejor tipado
interface TopProduct {
  name: string;
  quantity: number;
}

interface PaymentSummary {
  cash: number;
  card: number;
  mixed: number;
}

export default function DashboardPage() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payments, setPayments] = useState<PaymentSummary>({
    cash: 0,
    card: 0,
    mixed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Ajuste de fechas para Perú (UTC-5)
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );

      // 1. Consultar Órdenes de hoy
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .not("status", "eq", "cancelled");

      if (ordersError) throw ordersError;

      let revenue = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let mixedTotal = 0;

      ordersData?.forEach((order) => {
        const amount = parseFloat(order.total || 0);
        revenue += amount;

        // Normalización de métodos de pago para evitar errores de mayúsculas/minúsculas
        const method = order.payment_method?.toLowerCase();
        if (method === "cash" || method === "efectivo") cashTotal += amount;
        else if (method === "card" || method === "tarjeta") cardTotal += amount;
        else if (method === "mixed" || method === "mixto") mixedTotal += amount;
      });

      setTotalRevenue(revenue);
      setTotalOrders(ordersData?.length || 0);
      setPayments({ cash: cashTotal, card: cardTotal, mixed: mixedTotal });

      // 2. Consultar Items para el TOP 5
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("product_name, quantity")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      if (itemsError) throw itemsError;

      const productMap: Record<string, number> = {};
      itemsData?.forEach((item) => {
        const name = item.product_name || "Producto desconocido";
        productMap[name] = (productMap[name] || 0) + (item.quantity || 0);
      });

      const sortedProducts = Object.entries(productMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Formato localizado para Perú (Soles)
  const formatCurrency = (n: number) =>
    `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 mb-4"></div>
        <p className="text-dark-300 animate-pulse">
          Sincronizando caja del día...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Resumen de Ventas 📉
          </h1>
          <p className="text-sm text-dark-400">
            Huancayo, {new Date().toLocaleDateString("es-PE")}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-lg transition-all border border-dark-600"
        >
          🔄 Actualizar Datos
        </button>
      </div>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-emerald-500">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase">
              Ingresos Brutos
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <DollarSign size={24} className="text-emerald-400" />
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-blue-500">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase">
              Órdenes
            </p>
            <p className="text-2xl font-bold text-white mt-1">{totalOrders}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <ShoppingBag size={24} className="text-blue-400" />
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-purple-500">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase">
              Impuestos (IGV 18%)
            </p>
            <p className="text-2xl font-bold text-purple-400 mt-1">
              {formatCurrency(totalRevenue - totalRevenue / 1.18)}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <Percent size={24} className="text-purple-400" />
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-amber-500">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase">
              Ticket Promedio
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} className="text-amber-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Productos */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-6">
            <Utensils size={20} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              Ranking de Productos
            </h2>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-dark-500 text-center py-10">
              No se registran movimientos aún.
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-dark-600 group-hover:text-emerald-500 transition-colors">
                      0{index + 1}
                    </span>
                    <p className="text-sm font-semibold text-white">
                      {product.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-400">Vendidos:</span>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      {product.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de Caja */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard size={20} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Corte de Caja</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-dark-800/50 rounded-lg">
              <span className="text-sm text-dark-300 flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                Efectivo
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatCurrency(payments.cash)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-dark-800/50 rounded-lg">
              <span className="text-sm text-dark-300 flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                Tarjetas
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatCurrency(payments.card)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-dark-800/50 rounded-lg">
              <span className="text-sm text-dark-300 flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]"></div>
                Mixto
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatCurrency(payments.mixed)}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-dark-600">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-dark-400 uppercase font-bold mb-1">
                    Total Neto Recaudado
                  </p>
                  <p className="text-3xl font-black text-emerald-400">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-dark-500 uppercase">
                    Base imponible
                  </p>
                  <p className="text-sm text-dark-300">
                    {formatCurrency(totalRevenue / 1.18)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
