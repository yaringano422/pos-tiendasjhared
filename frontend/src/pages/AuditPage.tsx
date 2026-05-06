import { useEffect, useState } from "react";
import { auditApi } from "../services/api";
import { AuditLog } from "../types";
import {
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Ban,
  RefreshCcw,
} from "lucide-react";
import toast from "react-hot-toast";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchAuditData = async () => {
    setLoading(true);
    setHasError(false);

    try {
      const response: any = await auditApi.getLogs();

      // 🛡️ NORMALIZACIÓN DEFENSIVA
      const rawData = response?.data ?? response;

      const finalData: AuditLog[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];

      setLogs(finalData);

      // 🟠 ÉXITO SILENCIOSO (vacío)
      if (finalData.length === 0) {
        console.info("Auditoría sin registros (estado válido)");
      }
    } catch (error: any) {
      const status = error?.response?.status;

      // 🟢 404 = NO ERROR (flujo normal)
      if (status === 404) {
        console.info("Auditoría: backend sin registros (404)");
        setLogs([]);
        return;
      }

      // 🔴 ERROR REAL (500 / red / servidor caído)
      setHasError(true);
      console.error("Error crítico en auditoría:", error);

      toast.error("Falla de red: No se pudo obtener auditoría", {
        icon: "🚫",
        style: { background: "#7f1d1d", color: "#fff" },
      });

      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleVoidSale = async (saleId: number) => {
    if (
      !confirm(
        "¿ESTÁ SEGURO? Esta acción devolverá el stock y anulará el ingreso. Es irreversible.",
      )
    )
      return;

    setLoading(true);
    try {
      await auditApi.voidSale(saleId, "Anulación por Auditoría");
      toast.success("Venta anulada y stock restaurado");
      fetchAuditData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Error al anular");
    } finally {
      setLoading(false);
    }
  };

  const handlePartialReturn = async (
    saleId: number,
    itemsToReturn: any[] = [],
  ) => {
    setLoading(true);
    try {
      await auditApi.processReturn(saleId, itemsToReturn);
      toast.success("Devolución procesada correctamente");
      fetchAuditData();
    } catch (error: any) {
      toast.error("Error al procesar la devolución");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <ShieldCheck className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Panel de Auditoría
            </h1>
            <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">
              Seguridad de Transacciones
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditData}
          disabled={loading}
          className="text-gray-400 hover:text-white transition-colors p-2"
        >
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* AVISO ADMIN */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-3 text-amber-200 text-sm shadow-sm">
        <AlertCircle size={20} className="text-amber-500" />
        <p>
          <strong>Acceso Restringido:</strong> Solo administradores pueden
          autorizar anulaciones o devoluciones de stock.
        </p>
      </div>

      {/* 🔴 ERROR REAL */}
      {hasError && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-sm shadow-sm font-bold animate-pulse">
          <Ban size={20} />
          <p>
            Error de Sistema: La base de datos no responde. Verifique su
            conexión.
          </p>
        </div>
      )}

      {/* TABLA */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-dark-900/50 text-gray-400 text-xs uppercase font-black tracking-wider">
            <tr>
              <th className="p-4">Transacción</th>
              <th className="p-4">Estado Venta</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-10 text-center text-gray-500 italic"
                >
                  Analizando integridad de datos...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <div className="text-gray-600 italic font-mono uppercase tracking-tighter mb-2">
                    {hasError ? "SISTEMA FUERA DE LÍNEA" : "AUDITORÍA LIMPIA"}
                  </div>
                  <p className="text-gray-500 text-sm">
                    No hay transacciones para auditar.
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-white/[0.02] text-sm transition-colors"
                >
                  <td className="p-4">
                    <div className="font-bold text-white">
                      Venta #{log.sale_id}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {formatCurrency(log.sales?.total_price || 0)} •{" "}
                      {log.sales?.metodo_pago || "N/A"}
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        log.sales?.status === "anulada"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {(
                        log.sales?.status ||
                        log.status ||
                        "COMPLETADA"
                      ).toUpperCase()}
                    </span>
                  </td>

                  <td className="p-4 text-gray-400">
                    {log.users?.username || log.performed_by || "Sistema"}
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleVoidSale(log.sale_id)}
                        disabled={loading || log.sales?.status === "anulada"}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold disabled:opacity-30"
                      >
                        <Ban size={14} /> ANULAR
                      </button>

                      <button
                        onClick={() => handlePartialReturn(log.sale_id)}
                        disabled={loading || log.sales?.status === "anulada"}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-xs font-bold disabled:opacity-30"
                      >
                        <RotateCcw size={14} /> DEVOLUCIÓN
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
