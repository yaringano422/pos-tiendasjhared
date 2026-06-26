import { useEffect, useState } from "react";
import {
  History,
  Search,
  RefreshCw,
  Ban,
  CornerUpLeft,
  Wallet,
  CreditCard,
  Coins,
  QrCode,
} from "lucide-react";
import { salesApi } from "../services/api";
import { Sale } from "../types";
import toast from "react-hot-toast";
import { formatToPeruDateString, parseUTC } from "../utils/date";
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);

const formatToPeruDate = (dateString: string) => {
  //  parseo correcto desde UTC antes de formatear localmente
  const date = parseUTC(dateString);
  return date.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Obtiene la fecha de hoy de forma limpia
const hoyPeru = formatToPeruDateString(new Date());

export default function HistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para Filtros Avanzados combinados
  const [filterDate, setFilterDate] = useState("Todos");
  const [filterMetodo, setFilterMetodo] = useState("Todos");
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterDate !== "Todos") params.date = filterDate;
      if (filterMetodo !== "Todos") params.metodo_pago = filterMetodo;

      const data: Sale[] = await salesApi.getHistory(params);
      setSales(data);

      // Extraer fechas únicas usando el formateador de zona horaria nativo
      if (uniqueDates.length === 0 && data.length > 0) {
        const dates = data
          .map((s) => (s.date ? formatToPeruDateString(s.date) : ""))
          .filter(Boolean);
        setUniqueDates(Array.from(new Set(dates)));
      }
    } catch (error: any) {
      console.error("Error crítico en historial:", error);
      toast.error("No se pudo conectar con el servidor de Tiendas JHARED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterDate, filterMetodo]);

  // Filtrado reactivo en el cliente por buscador de ID o Nombre de Cliente
  const filteredSales = sales.filter(
    (sale) =>
      sale.id?.toString().includes(searchTerm) ||
      sale.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- FILTRADO FINANCIERO STRICT (Excluye canceladas, cotizaciones y devoluciones) ---
  const salesConIngresoReal = sales.filter(
    (s) =>
      s.status !== "cancelled" &&
      s.status !== "cotizacion" &&
      s.status !== "returned",
  );

  const totalVendido = salesConIngresoReal.reduce(
    (sum, s) => sum + (Number(s?.total_price) || 0),
    0,
  );
  const totalEfectivo = salesConIngresoReal.reduce(
    (sum, s) => sum + (Number(s?.pago_efectivo) || 0),
    0,
  );
  const totalTarjeta = salesConIngresoReal.reduce(
    (sum, s) => sum + (Number(s?.pago_tarjeta) || 0),
    0,
  );
  const totalComisiones = salesConIngresoReal.reduce(
    (sum, s) => sum + (Number(s?.comision_tarjeta) || 0),
    0,
  );

  // lógica para calcular los ingresos puramente digitales (Yape, Plin, Transferencias)
  const totalDigital = salesConIngresoReal.reduce((sum, s) => {
    const metodo = s.metodo_pago?.toLowerCase();
    if (
      metodo === "yape_plin" ||
      metodo === "yape" ||
      metodo === "plin" ||
      metodo === "transferencia"
    ) {
      return sum + (Number(s?.total_price) || 0);
    }
    return sum;
  }, 0);

  const handleCancelSale = async (saleId: number) => {
    const reason = prompt("Ingrese el motivo de la ANULACIÓN de la venta:");
    if (!reason || !reason.trim()) return;

    const loadingToast = toast.loading("Procesando anulación...");
    try {
      await salesApi.cancel(saleId, { reason });
      toast.success(`Venta #V-${saleId} Anulada correctamente`, {
        id: loadingToast,
      });
      fetchHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error al anular", {
        id: loadingToast,
      });
    }
  };

  const handleReturnSale = async (saleId: number) => {
    const reason = prompt("Ingrese el motivo de la DEVOLUCIÓN de productos:");
    if (!reason || !reason.trim()) return;

    const loadingToast = toast.loading("Procesando devolución...");
    try {
      await salesApi.return(saleId, { reason });
      toast.success(`Devolución de Venta #V-${saleId} registrada`, {
        id: loadingToast,
      });
      fetchHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error al procesar devolución", {
        id: loadingToast,
      });
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="text-blue-400" /> Historial de Ventas
        </h1>
        <button
          onClick={fetchHistory}
          className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* --- PANEL DE TOTALES  --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1.5 mb-1">
              <Coins size={14} className="text-emerald-400" /> Caja: Total
              Vendido
            </p>
            <p className="text-xl font-black text-emerald-400">
              {formatCurrency(totalVendido)}
            </p>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1.5 mb-1">
              <Wallet size={14} className="text-gray-200" /> Caja: Efectivo Neto
            </p>
            <p className="text-xl font-black text-white">
              {formatCurrency(totalEfectivo)}
            </p>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1.5 mb-1">
              <CreditCard size={14} className="text-blue-400" /> Caja: Tarjeta
              Neto
            </p>
            <p className="text-xl font-black text-blue-400">
              {formatCurrency(totalTarjeta)}
            </p>
          </div>
        </div>

        {/* INGRESOS DIGITALES QR / TRANSFERENCIAS */}
        <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1.5 mb-1">
              <QrCode size={14} className="text-purple-400" /> QR & Bancos Neto
            </p>
            <p className="text-xl font-black text-purple-400">
              {formatCurrency(totalDigital)}
            </p>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1.5 mb-1">
              <Coins size={14} className="text-amber-500" /> Comisiones
              Recaudadas
            </p>
            <p className="text-xl font-black text-amber-500">
              {formatCurrency(totalComisiones)}
            </p>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN FILTROS AVANZADOS COMBINADOS --- */}
      <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-400 font-bold mb-1">
            FILTRAR POR FECHA
          </label>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2 text-white text-sm outline-none"
          >
            <option value="Todos">Todas las fechas</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d === hoyPeru ? `${d} (Hoy)` : d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-bold mb-1">
            MÉTODO DE PAGO
          </label>
          <select
            value={filterMetodo}
            onChange={(e) => setFilterMetodo(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2 text-white text-sm outline-none"
          >
            <option value="Todos">Todos los métodos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta (+5%)</option>
            <option value="Yape">Yape</option>
            <option value="Plin">Plin</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 font-bold mb-1">
            BÚSQUEDA RÁPIDA
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-gray-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar por correlativo #V-... o Cliente"
              className="w-full bg-dark-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm border border-dark-600 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* --- TABLA DEL HISTORIAL --- */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-dark-900/50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="p-4">Venta ID</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Leyenda / Cliente</th>
              <th className="p-4">Método</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-right">Monto Cobrado</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-500">
                  Sincronizando operaciones con Huancayo...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-16 text-center">
                  <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full text-xs font-bold border border-amber-500/20 inline-block mb-2">
                    SISTEMA SIN REGISTROS CON ESTOS FILTROS
                  </div>
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className={`text-gray-300 text-sm transition-colors ${
                    sale.status === "cancelled"
                      ? "bg-red-500/5 opacity-50"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="p-4 text-blue-400 font-mono font-bold">
                    #V-{sale.id}
                  </td>
                  <td className="p-4">
                    {sale.date ? formatToPeruDate(sale.date) : "---"}
                  </td>
                  <td className="p-4 font-semibold text-white">
                    {sale.customers?.name || "PÚBLICO GENERAL"}
                  </td>
                  <td className="p-4 uppercase text-xs font-mono">
                    <span className="px-2 py-1 bg-dark-900/60 rounded-md border border-dark-700">
                      {sale.metodo_pago}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase ${
                        sale.status === "completada"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : sale.status === "cancelled"
                            ? "bg-red-500/10 text-red-400"
                            : sale.status === "returned"
                              ? "bg-orange-500/10 text-orange-400"
                              : sale.status === "cotizacion"
                                ? "bg-blue-500/10 text-blue-400"
                                : sale.status === "reserva"
                                  ? "bg-purple-500/10 text-purple-400"
                                  : "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {sale.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-white">
                    {formatCurrency(Number(sale.total_price) || 0)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleCancelSale(sale.id)}
                        disabled={sale.status === "cancelled"}
                        title="Anular venta y reponer stock"
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        onClick={() => handleReturnSale(sale.id)}
                        disabled={
                          sale.status === "cancelled" ||
                          sale.status === "returned"
                        }
                        title="Registrar devolución de producto"
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <CornerUpLeft size={14} />
                      </button>
                    </div>
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
