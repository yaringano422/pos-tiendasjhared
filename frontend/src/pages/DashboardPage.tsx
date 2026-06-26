import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Typography,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Smartphone,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// IMPORTACIONES DE UI
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../app/ui/card";
import { Badge } from "../app/ui/badge";
import { Button } from "../app/ui/button";
import { Progress } from "../app/ui/progress";
import { Input } from "../app/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../app/ui/avatar";

// Importaciones del servicio y tipos reales
import { salesApi, inventoryApi } from "../services/api";
import { Sale } from "../types";
import { Product } from "../types";
import { formatToTitleCase } from "../utils/formatters";
// IMPORTACIÓN DE UTILIDADES DE FECHA CORREGIDAS
import { formatToPeruDateString } from "../utils/date";

// --- INTERFACES DE TIPIFICACIÓN ESTRUCTURAL ---
interface DashboardMetrics {
  totalSales: number;
  productsSold: number;
  totalInventory: number;
  newCustomers: number;
}

interface SalesTrendItem {
  name: string;
  ventas: number;
}

interface InventoryDistItem {
  name: string;
  value: number;
  color: string;
}

interface TopProductItem {
  name: string;
  ventas: number;
  revenue: number;
}

interface LowStockAlertItem {
  producto: string;
  stock: number;
  minimo: number;
}

interface DashboardData {
  metrics: DashboardMetrics;
  salesTrend: SalesTrendItem[];
  inventoryDistribution: InventoryDistItem[];
  topProducts: TopProductItem[];
  recentTransactions: Sale[];
  lowStockAlerts: LowStockAlertItem[];
}

// --- COMPONENTE AUXILIAR TARJETA MÉTRICA ---
interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: any;
  trend: "up" | "down";
  delay?: number;
}

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  delay = 0,
}: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="relative overflow-hidden border-slate-800 bg-slate-900/80 backdrop-blur-sm hover:border-slate-700 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          {title}
        </CardTitle>
        <div
          className={`p-2 rounded-xl ${trend === "up" ? "bg-green-500/10" : "bg-red-500/10"}`}
        >
          <Icon
            className={`w-4 h-4 ${trend === "up" ? "text-green-400" : "text-red-400"}`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-100 tracking-tight">
          {value}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" ? (
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          )}
          <span
            className={`text-sm font-medium ${trend === "up" ? "text-green-400" : "text-red-400"}`}
          >
            {change}
          </span>
          <span className="text-sm text-slate-500 ml-1">en tiempo real</span>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// --- COMPONENTE PRINCIPAL ---
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [salesData, productsData] = await Promise.all([
          salesApi.getHistory(),
          inventoryApi.getAll(),
        ]);

        // --- FILTRADO FINANCIERO STRICT (Excluye canceladas, cotizaciones y devoluciones) ---
        const salesConIngresoReal = salesData.filter(
          (s) =>
            s.status !== "cancelled" &&
            s.status !== "cotizacion" &&
            s.status !== "returned",
        );

        // 1. OBTENER FECHA DE HOY EN PERÚ USANDO LA UTILERÍA BLINDADA
        const hoyPeru = formatToPeruDateString(new Date());

        // 2. FILTRAR VENTAS DE HOY SIN DESFASES (Indicador: Ventas del Día)
        const ventasHoy = salesConIngresoReal.filter((s: Sale) => {
          if (!s.date) return false;
          return formatToPeruDateString(s.date) === hoyPeru;
        });

        const totalVentasHoy = ventasHoy.reduce(
          (sum: number, s: Sale) => sum + (Number(s.total_price) || 0),
          0,
        );

        // Conteo de transacciones reales totales con ingreso financiero real
        const productosVendidos = salesConIngresoReal.reduce(
          (sum, s) => sum + 1,
          0,
        );

        const totalInventarioReal = productsData.reduce(
          (sum: number, p: any) =>
            p.is_active ? sum + (Number(p.stock_actual) || 0) : sum,
          0,
        );

        const uniqueCustomers = new Set<string>();
        salesConIngresoReal.forEach((s) => {
          if (s.customers?.name) {
            const nameUpper = s.customers.name.toUpperCase().trim();
            if (nameUpper !== "PÚBLICO GENERAL" && nameUpper !== "") {
              uniqueCustomers.add(nameUpper);
            }
          }
        });

        // 3. TENDENCIA DINÁMICA AGRUPADA CON LA UTILERÍA BLINDADA (Indicador: Tendencia de Ventas)
        const trendMap = salesConIngresoReal.reduce((acc: any, s) => {
          if (!s.date) return acc;

          //interpretación UTC exacta y cambiar a YYYY-MM-DD de Perú
          const datePeru = formatToPeruDateString(s.date);

          acc[datePeru] = (acc[datePeru] || 0) + Number(s.total_price || 0);
          return acc;
        }, {});

        const salesTrend = Object.keys(trendMap)
          .sort()
          .map((date) => ({
            name: date.slice(5), // Conserva el formato MM-DD (Ej: "06-25")
            ventas: trendMap[date],
          }));

        // 4. Alertas de Stock
        const UMBRAL_STOCK_BAJO = 5;
        const lowStockAlerts = productsData
          .filter((p) => Number(p.stock_actual) <= UMBRAL_STOCK_BAJO)
          .map((p) => ({
            producto: p.name,
            stock: Number(p.stock_actual),
            minimo: UMBRAL_STOCK_BAJO,
          }));

        // Paleta de colores para categorías
        const COLORS = [
          "#60a5fa",
          "#a78bfa",
          "#34d399",
          "#fbbf24",
          "#f87171",
          "#22d3ee",
          "#818cf8",
          "#c084fc",
          "#e879f9",
          "#fb7185",
          "#fdba74",
          "#4ade80",
          "#2dd4bf",
          "#38bdf8",
        ];

        const distributionMap = productsData.reduce((acc: any, p: any) => {
          if (p.is_active === true && p.category) {
            const cat = p.category.trim();
            const stock = Number(p.stock_actual) || 0;
            acc[cat] = (acc[cat] || 0) + stock;
          }
          return acc;
        }, {});

        const inventoryDistribution = Object.keys(distributionMap).map(
          (cat, index) => ({
            name: cat,
            value: distributionMap[cat],
            color: COLORS[index % COLORS.length],
          }),
        );

        const topProducts = productsData
          .filter((p: any) => p.is_active === true && Number(p.stock_sold) > 0)
          .map((p: any) => ({
            name: p.name,
            ventas: Number(p.stock_sold),
            revenue: Number(p.stock_sold) * Number(p.price),
            porcentaje: Number(p.sale_percentage) || 0,
          }))
          .sort((a, b) => b.porcentaje - a.porcentaje)
          .slice(0, 5);

        if (isMounted) {
          setDashboardData({
            metrics: {
              totalSales: totalVentasHoy,
              productsSold: productosVendidos,
              totalInventory: totalInventarioReal,
              newCustomers: uniqueCustomers.size,
            },
            salesTrend,
            inventoryDistribution,
            topProducts,
            recentTransactions: salesData.slice(0, 5),
            lowStockAlerts,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        if (isMounted) {
          setError("No se pudo sincronizar la información.");
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium text-sm animate-pulse">
          Sincronizando operaciones con Tiendas JHARED...
        </p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-100 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-slate-300 font-semibold">
          {error || "Error inesperado"}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Reintentar conexión
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount);

  return (
    <div className="w-full p-4 md:p-6 text-slate-100 selection:bg-blue-500/30 selection:text-blue-200 antialiased">
      <main className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Dashboard Real-Time
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Rendimiento en base al historial de operaciones.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Sincronización local
              </p>
              <p className="text-lg font-bold text-slate-200">
                Huancayo, Zona Horaria PE
              </p>
            </div>
          </div>
        </motion.div>

        {/* CONTENEDOR DE TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Ventas del Día"
            value={formatCurrency(dashboardData.metrics.totalSales)}
            change="Monto Neto"
            icon={DollarSign}
            trend="up"
            delay={0.1}
          />

          <MetricCard
            title="Productos Vendidos"
            value={`${dashboardData.metrics.productsSold} uds.`}
            change="Transacciones"
            icon={Smartphone}
            trend="up"
            delay={0.2}
          />

          <MetricCard
            title="Inventario Total (Uds)"
            value={dashboardData.metrics.totalInventory.toLocaleString("es-PE")}
            change="Stock disponible"
            icon={Package}
            trend="up"
            delay={0.3}
          />

          <MetricCard
            title="Clientes Nuevos"
            value={dashboardData.metrics.newCustomers}
            change="Fidelizados"
            icon={Users}
            trend="up"
            delay={0.4}
          />
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">
                Tendencia de Ventas
              </CardTitle>
              <CardDescription className="text-slate-400">
                Comparación de ingresos netos diarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.salesTrend}>
                  <defs>
                    <linearGradient
                      id="colorVentas"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.25}
                      />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    opacity={0.5}
                  />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f1f5f9",
                    }}
                    itemStyle={{ color: "#60a5fa" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVentas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">
                Distribución de Inventario
              </CardTitle>
              <CardDescription className="text-slate-400">
                Valorización por categorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.inventoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {dashboardData.inventoryDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        name={formatToTitleCase(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2.5">
                {dashboardData.inventoryDistribution.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-none"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-400 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-slate-200">
                      {item.value} und.
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTAS OPERATIVAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">
                Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData.topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-200">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {product.ventas} uds. vendidas
                    </p>
                  </div>
                  <p className="font-bold text-blue-400">
                    S/. {product.revenue.toLocaleString("es-PE")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">
                Transacciones Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-200">
                      {transaction.customers?.name || "PÚBLICO GENERAL"}
                    </p>
                    <p className="text-xs text-slate-400 font-mono text-blue-400">
                      #V-{transaction.id} • {transaction.metodo_pago}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-200">
                      {formatCurrency(Number(transaction.total_price) || 0)}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        transaction.status === "cancelled"
                          ? "bg-red-500/10 text-red-400"
                          : transaction.status === "completada" ||
                              transaction.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {transaction.status === "active"
                        ? "COMPLETADA"
                        : transaction.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ALERTAS DE STOCK */}
        <Card className="border-red-950 bg-slate-900/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <CardTitle className="text-slate-200">
              Alertas de Stock Mínimo Crítico
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboardData.lowStockAlerts.map((alert, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm"
              >
                <div className="flex justify-between mb-2">
                  <p className="font-semibold text-slate-200 truncate pr-2">
                    {alert.producto}
                  </p>
                  <Badge
                    variant="destructive"
                    className="bg-red-500/10 text-red-400 border-none text-[11px]"
                  >
                    Reabastecer
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Stock disponible:</span>
                    <span className="font-bold text-red-400">
                      {alert.stock} uds.
                    </span>
                  </div>
                  <Progress
                    value={(alert.stock / alert.minimo) * 100}
                    className="h-1.5 bg-slate-800"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
