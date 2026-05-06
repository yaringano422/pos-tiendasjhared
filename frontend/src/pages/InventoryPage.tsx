import { useEffect, useState, useCallback, useMemo } from "react";
import { inventoryApi } from "../services/api";
import * as XLSX from "xlsx";
import { Product } from "../types";
import {
  Search,
  Package,
  Edit,
  Trash2,
  FileSpreadsheet,
  Plus,
  Barcode,
  X,
  Tag,
  DollarSign,
  Layers,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  TrendingUp,
  Download,
  Eye,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

export default function InventoryPage() {
  // --- ESTADOS ---
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterBrand, setFilterBrand] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // ✅ CORRECCIÓN 1: Se eliminó 'description' de la definición del estado
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    brand: "",
    category: "",
    cost_buy: 0,
    price: 0,
    price_major: 0,
    stock_actual: 0,
    stock_min: 0,
  });

  // --- CARGA DE DATOS ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getAll();
      const axiosData = response.data as any;
      const finalData = axiosData?.data || axiosData;
      setItems(Array.isArray(finalData) ? finalData : []);
    } catch (error) {
      console.error(error);
      toast.error("Error al sincronizar con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- LÓGICA DE FILTRADO ---
  const filteredItems = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(term) ||
        (item.barcode && item.barcode.includes(term)) ||
        item.brand?.toLowerCase().includes(term);

      const matchesCat =
        filterCategory === "Todos" || item.category === filterCategory;
      const matchesBrand =
        filterBrand === "Todos" || item.brand === filterBrand;

      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [items, search, filterCategory, filterBrand]);

  // --- ACCIONES DE PRODUCTO ---
  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este producto definitivamente?"))
      return;

    const loadingToast = toast.loading("Eliminando...");
    try {
      await inventoryApi.delete(id);
      toast.success("Producto eliminado del inventario", { id: loadingToast });
      loadData();
    } catch (error) {
      toast.error("No se pudo eliminar el producto", { id: loadingToast });
    }
  };

  // ✅ CORRECCIÓN 2 (Tu Captura 1): Sincronizado con el nuevo estado sin 'description'
  const handleEditProduct = (item: Product) => {
    setEditingId(item.id || null);
    setFormData({
      name: item.name || "",
      barcode: item.barcode || "",
      brand: item.brand || "",
      category: item.category || "",
      cost_buy: item.cost_buy || 0,
      price: item.price || 0,
      price_major: item.price_major || 0,
      stock_actual: item.stock_actual || 0,
      stock_min: item.stock_min || 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) return toast.error("El nombre es obligatorio");
    if (formData.price <= 0) return toast.error("El precio debe ser mayor a 0");

    if (formData.price < formData.cost_buy) {
      if (!confirm("El precio de venta es MENOR al costo. ¿Deseas continuar?"))
        return;
    }

    const loadingToast = toast.loading(
      editingId ? "Actualizando..." : "Guardando...",
    );
    try {
      if (editingId) {
        await inventoryApi.update(editingId, formData);
        toast.success("Producto actualizado correctamente", {
          id: loadingToast,
        });
      } else {
        await inventoryApi.create(formData);
        toast.success("Producto registrado con éxito", { id: loadingToast });
      }
      closeModal();
      loadData();
    } catch (error) {
      toast.error("Error al procesar la solicitud", { id: loadingToast });
    }
  };

  // ✅ CORRECCIÓN 3 (Tu Captura 2): Reset del formulario sin 'description'
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      barcode: "",
      brand: "",
      category: "",
      cost_buy: 0,
      price: 0,
      price_major: 0,
      stock_actual: 0,
      stock_min: 0,
    });
  };

  // --- AUTOFOCUS ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen || e.ctrlKey || e.altKey || e.metaKey) return;
      const active = document.activeElement as HTMLElement;
      if (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT"
      )
        return;
      const searchInput = document.getElementById("inventory-search-input");
      if (searchInput) searchInput.focus();
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isModalOpen]);

  // --- EXPORTACIÓN ---
  const handleExportExcel = () => {
    const reportData = filteredItems.map((i) => ({
      "COD. BARRAS": i.barcode || "N/A",
      DESCRIPCIÓN: i.name,
      MARCA: i.brand || "-",
      CATEGORÍA: i.category || "-",
      "STOCK ACTUAL": i.stock_actual,
      "COSTO UNIT.": i.cost_buy,
      "PRECIO VENTA": i.price,
      "UTILIDAD UNIT.": (i.price || 0) - (i.cost_buy || 0),
      "VALORIZACIÓN STOCK": (i.cost_buy || 0) * (i.stock_actual || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario Completo");
    XLSX.writeFile(
      wb,
      `Inventario_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Excel generado correctamente");
  };

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean)),
  ) as string[];
  const brands = Array.from(
    new Set(items.map((i) => i.brand).filter(Boolean)),
  ) as string[];

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-dark-950 text-white">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-dark-400 animate-pulse font-medium tracking-widest uppercase text-xs">
          Sincronizando Almacén
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-4 md:p-8 space-y-8 font-sans selection:bg-brand-500/30">
      {/* HEADER */}
      <div className="relative overflow-hidden bg-dark-900/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] -z-10 rounded-full" />
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Package className="text-brand-500" size={36} />
            Inventario <span className="text-brand-500">.</span>
          </h1>
          <p className="text-dark-400 font-medium tracking-wide">
            Gestión de existencias y control de activos
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleExportExcel}
            className="group flex items-center gap-2 bg-white/5 text-white px-6 py-4 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            <Download
              size={20}
              className="text-dark-400 group-hover:text-white transition-colors"
            />
            <span className="font-bold">Exportar</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_40px_-10px_rgba(var(--brand-rgb),0.5)] hover:bg-brand-500 hover:-translate-y-1 transition-all active:scale-95"
          >
            <Plus size={22} strokeWidth={3} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-900/30 p-6 rounded-3xl border border-white/5 flex items-center gap-5">
          <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500">
            <Layers />
          </div>
          <div>
            <p className="text-dark-400 text-xs font-bold uppercase tracking-wider">
              Total Items
            </p>
            <p className="text-2xl font-black text-white">{items.length}</p>
          </div>
        </div>
        <div className="bg-dark-900/30 p-6 rounded-3xl border border-white/5 flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
            <TrendingUp />
          </div>
          <div>
            <p className="text-dark-400 text-xs font-bold uppercase tracking-wider">
              Valorización
            </p>
            <p className="text-2xl font-black text-white">
              S/.{" "}
              {items
                .reduce((acc, i) => acc + i.cost_buy * i.stock_actual, 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-dark-900/30 p-6 rounded-3xl border border-white/5 flex items-center gap-5">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
            <AlertTriangle />
          </div>
          <div>
            <p className="text-dark-400 text-xs font-bold uppercase tracking-wider">
              Bajo Stock
            </p>
            <p className="text-2xl font-black text-white">
              {items.filter((i) => i.stock_actual <= (i.stock_min || 5)).length}
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 relative group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-brand-500 transition-colors"
            size={20}
          />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Buscar por nombre, marca o escanea el código..."
            className="w-full bg-dark-900/40 border border-white/5 rounded-[1.5rem] py-5 pl-14 pr-6 text-white placeholder:text-dark-600 focus:border-brand-500/50 focus:bg-dark-900/80 outline-none transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="lg:col-span-3">
          <div className="relative">
            <Filter
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500"
              size={18}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-dark-900/40 border border-white/5 rounded-[1.5rem] py-5 pl-12 pr-4 text-white appearance-none outline-none focus:border-brand-500/50 transition-all font-bold"
            >
              <option value="Todos">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="relative">
            <Tag
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500"
              size={18}
            />
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full bg-dark-900/40 border border-white/5 rounded-[1.5rem] py-5 pl-12 pr-4 text-white appearance-none outline-none focus:border-brand-500/50 transition-all font-bold"
            >
              <option value="Todos">Todas las Marcas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-dark-900/20 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-dark-400 text-[11px] uppercase tracking-[0.2em] font-black">
                <th className="px-8 py-6">Producto Info</th>
                <th className="px-6 py-6">Clasificación</th>
                <th className="px-6 py-6">Precios</th>
                <th className="px-6 py-6 text-center">Existencias</th>
                <th className="px-8 py-6 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center text-dark-500 group-hover:scale-110 group-hover:text-brand-400 transition-all border border-white/5">
                        <Package size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-base group-hover:text-brand-400 transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-dark-800 text-dark-400 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1 uppercase tracking-tighter">
                            <Barcode size={10} /> {item.barcode || "SIN CÓDIGO"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="text-white text-xs font-bold">
                        {item.brand || "Genérico"}
                      </div>
                      <div className="text-dark-500 text-[11px] uppercase tracking-wider">
                        {item.category || "Otros"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="text-xs text-dark-500 flex items-center gap-1">
                        Costo:{" "}
                        <span className="font-mono">
                          S/. {item.cost_buy?.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-emerald-400 font-black flex items-center gap-1">
                        Venta:{" "}
                        <span className="text-sm">
                          S/. {item.price?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center">
                      <span
                        className={clsx(
                          "px-4 py-2 rounded-xl font-mono font-black text-sm min-w-[60px] text-center",
                          item.stock_actual <= (item.stock_min || 5)
                            ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/20 animate-pulse"
                            : "bg-dark-800 text-white",
                        )}
                      >
                        {item.stock_actual}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditProduct(item)}
                        className="p-3 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-xl transition-all"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(item.id!)}
                        className="p-3 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl transition-all animate-in fade-in duration-300">
          <div className="bg-[#12141c] border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            <div className="w-full md:w-1/3 bg-gradient-to-b from-brand-600 to-brand-900 p-10 text-white flex flex-col justify-between overflow-hidden relative">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50" />
              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-3xl backdrop-blur-lg flex items-center justify-center">
                  <Package size={32} strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black leading-tight">
                  {editingId ? "Actualizar Inventario" : "Registrar Producto"}
                </h2>
                <p className="text-brand-100 text-sm font-medium leading-relaxed">
                  Completa la ficha técnica para mantener el control exacto de
                  tus activos.
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2 group">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1 group-focus-within:text-brand-500 transition-colors">
                      Nombre del Producto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Teclado Mecánico RGB"
                      className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 px-5 text-white outline-none focus:border-brand-500 focus:bg-black transition-all font-bold"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1">
                      Código de Barras
                    </label>
                    <div className="relative">
                      <Barcode
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-600"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Escanea el código"
                        className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-white outline-none focus:border-brand-500 transition-all font-mono text-sm"
                        value={formData.barcode}
                        onChange={(e) =>
                          setFormData({ ...formData, barcode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1">
                      Categoría
                    </label>
                    <input
                      type="text"
                      placeholder="Informática, Hogar..."
                      className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 px-5 text-white outline-none focus:border-brand-500 transition-all font-bold"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1">
                      Costo de Compra (S/.)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 px-5 text-emerald-500 outline-none focus:border-emerald-500 transition-all font-black text-lg"
                      value={formData.cost_buy}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_buy: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1">
                      Precio de Venta (S/.)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 px-5 text-brand-400 outline-none focus:border-brand-500 transition-all font-black text-lg"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 px-5 text-white outline-none focus:border-brand-500 transition-all font-black text-lg"
                      value={formData.stock_actual}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_actual: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] px-1">
                      Mínimo Crítico
                    </label>
                    <input
                      type="number"
                      className="w-full bg-dark-950 border border-white/5 rounded-2xl py-4 px-5 text-red-500 outline-none focus:border-red-500 transition-all font-black text-lg"
                      value={formData.stock_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_min: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="p-10 bg-white/[0.01] border-t border-white/5 flex gap-4">
                <button
                  onClick={closeModal}
                  className="flex-1 py-5 text-dark-400 font-black uppercase tracking-widest text-[11px] hover:bg-white/5 rounded-[1.5rem] transition-all"
                >
                  Descartar
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="flex-[2] bg-brand-600 text-white font-black uppercase tracking-widest text-[11px] py-5 rounded-[1.5rem] shadow-xl shadow-brand-900/20 hover:bg-brand-500 hover:-translate-y-1 transition-all active:scale-95"
                >
                  {editingId ? "Confirmar Cambios" : "Finalizar Registro"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
