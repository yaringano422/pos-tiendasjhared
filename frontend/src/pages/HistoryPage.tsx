import { useEffect, useState } from "react";
import { History, Search, Calendar, Tag, RefreshCw } from "lucide-react";
import { salesApi } from "../services/api";
import { Sale } from "../types";
import toast from "react-hot-toast";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);

export default function HistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchHistory = async () => {
    setLoading(true);

    try {
      const response: any = await salesApi.getHistory();

      // 🔥 NORMALIZACIÓN ULTRA DEFENSIVA
      const rawData = response?.data ?? response;

      let finalData: Sale[] = [];

      if (Array.isArray(rawData)) {
        finalData = rawData;
      } else if (rawData && Array.isArray(rawData.data)) {
        finalData = rawData.data;
      } else {
        finalData = [];
      }

      setSales(finalData);

      // 🟠 Estado normal: vacío
      if (finalData.length === 0) {
        console.info("Historial vacío (respuesta válida del servidor)");
      }
    } catch (error: any) {
      // 🔍 DETECCIÓN DEFENSIVA DE ERROR
      const status = error?.response?.status;
      const message = error?.message || "";

      const is404 =
        status === 404 ||
        message.includes("404") ||
        message.toLowerCase().includes("not found");

      if (is404) {
        // 🟠 ÉXITO SILENCIOSO
        console.info("Sin registros (404 controlado)");
        setSales([]);
      } else {
        // 🔴 ERROR REAL (red, 500, etc.)
        console.error("Error crítico:", error);

        toast.error("Error crítico: No se pudo conectar con el servidor", {
          style: { background: "#ef4444", color: "#fff" },
          duration: 4000,
        });

        setSales([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredSales = sales.filter(
    (sale) =>
      sale.id?.toString().includes(searchTerm) ||
      sale.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalHistorial = sales.reduce(
    (sum, s) => sum + (Number(s?.total_price) || 0),
    0,
  );

  const QuickStats = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase font-bold">{label}</p>
        <p className="text-xl font-black text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="text-blue-400" /> Historial de Ventas
        </h1>
        <button
          onClick={fetchHistory}
          className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickStats
          label="Total en Historial"
          value={formatCurrency(totalHistorial)}
          icon={Tag}
          color="bg-blue-500/10 text-blue-400"
        />
        <QuickStats
          label="Transacciones"
          value={sales.length.toString()}
          icon={Calendar}
          color="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* TABLA */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-dark-700 bg-dark-900/30">
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-gray-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por ID o cliente..."
              className="w-full bg-dark-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-dark-900/50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Cliente</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-500">
                  Sincronizando...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-16 text-center">
                  <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full text-xs font-bold border border-amber-500/20 inline-block mb-2">
                    SISTEMA SIN REGISTROS
                  </div>
                  <p className="text-gray-500 text-sm">
                    No hay ventas registradas.
                  </p>
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-white/[0.03] text-gray-300 text-sm"
                >
                  <td className="p-4 text-blue-400 font-mono">#V-{sale.id}</td>
                  <td className="p-4">
                    {sale.date
                      ? new Date(sale.date).toLocaleDateString()
                      : "---"}
                  </td>
                  <td className="p-4">
                    {sale.customers?.name || "Consumidor Final"}
                  </td>
                  <td className="p-4 text-right font-bold text-white">
                    {formatCurrency(Number(sale.total_price) || 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
