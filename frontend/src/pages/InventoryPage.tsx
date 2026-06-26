import React, { useState, useMemo, useEffect } from "react";
import { useProducts } from "../hooks/useProducts";
import { inventoryApi } from "../services/api"; // Centralizacion de todas las peticiones HTTP
import { Product, InsertProductInput, Provider } from "../types";
import {
  Search,
  Package,
  Edit,
  Trash2,
  Plus,
  Download,
  X,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { Combobox } from "@/components/Combobox";
const formatToTitleCase = (str: string | null | undefined) => {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
export default function InventoryPage() {
  const { products, loading, refetch } = useProducts();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

      // Mapeo directo: si el usuario pone los nombres iguales, esto funciona directo
      const payload = jsonData.map((item) => ({
        name: item.name,
        price: Number(item.price),
        cost_buy: Number(item.cost_buy),
        price_major: Number(item.price_major || 0),
        stock_actual: Number(item.stock_actual || 0),
        brand: item.brand,
        category: item.category,
        barcode: item.barcode ? String(item.barcode) : null,
        provider_name: item.provider_name,
      }));

      try {
        const loadingToast = toast.loading("Importando productos...");
        await inventoryApi.bulkImport({ products: payload });
        toast.success("Importación completada", { id: loadingToast });
        await refetch();
      } catch (error) {
        toast.error("Error al importar");
      }
    };
    reader.readAsBinaryString(file);
  };
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Se guardan los valores locales para el modal
  const [editingProduct, setEditingProduct] = useState<Record<
    string,
    any
  > | null>(null);

  // Cargar proveedores para las sugerencias del autocompletado interactivo
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await inventoryApi.getProviders();
        console.log("Respuesta de API:", response); // Revisar en consola
        if (response && response.data) {
          setProviders(response.data);
        }
      } catch (err) {
        console.error("Error:", err);
      }
    };

    if (isModalOpen) {
      fetchProviders();
    }
  }, [isModalOpen]);

  // Filtrado por nombre, código, marca o proveedor
  const filteredProducts = useMemo(() => {
    const productList = Array.isArray(products) ? products : [];
    if (!search.trim()) return productList;
    const searchLower = search.toLowerCase();

    return productList.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(searchLower) || false;
      const barcodeMatch = p.barcode?.includes(search) || false;
      const brandMatch = p.brand?.toLowerCase().includes(searchLower) || false;
      const categoryMatch =
        p.category?.toLowerCase().includes(searchLower) || false;
      const providerMatch =
        p.providers?.name?.toLowerCase().includes(searchLower) || false;

      return (
        nameMatch ||
        barcodeMatch ||
        brandMatch ||
        categoryMatch ||
        providerMatch
      );
    });
  }, [products, search]);
  const categoryOptions = useMemo(() => {
    const categories = products
      .map((p) => p.category)
      .filter(Boolean) as string[];
    return Array.from(new Set(categories.map((c) => c.toLowerCase())));
  }, [products]);

  const brandOptions = useMemo(() => {
    const brands = products.map((p) => p.brand).filter(Boolean) as string[];
    return Array.from(new Set(brands.map((b) => b.toLowerCase())));
  }, [products]);

  const handleInputChange = (field: string, value: string) => {
    setEditingProduct((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProduct?.name?.trim()) {
      return toast.error("El nombre es requerido");
    }

    const price = Number(editingProduct.price || 0);
    const cost_buy = Number(editingProduct.cost_buy || 0);
    const price_major = Number(editingProduct.price_major || 0);
    const stock_actual = Number(editingProduct.stock_actual || 0);
    const stock = Number(editingProduct.stock || 0);

    // Se delega el cálculo estricto de ventas y porcentajes al Backend unificado
    if (price <= 0) return toast.error("El precio de venta debe ser mayor a 0");
    if (cost_buy < 0)
      return toast.error("El costo de compra no puede ser negativo");
    if (price < cost_buy)
      return toast.error("El precio de venta no puede ser menor al costo");
    if (stock_actual < 0) return toast.error("El stock no puede ser negativo");
    if (stock < 0) return toast.error("El stock inicial no puede ser negativo");
    if (price_major < 0)
      return toast.error("El precio mayorista no puede ser negativo");

    if (
      editingProduct.price_major &&
      Number(editingProduct.price_major) < Number(editingProduct.cost_buy)
    ) {
      return toast.error(
        "El precio mayorista no puede ser menor que el costo de compra.",
      );
    }

    const loadingToast = toast.loading("Procesando...");

    try {
      // Se envia provider_name en texto plano para que el service lo normalice en minúsculas y sin espacios
      const payload: any = {
        name: editingProduct.name.trim(),
        // Se aplica la misma lógica de normalización que el backend usa para proveedores
        brand: editingProduct.brand?.trim().toLowerCase() || null,
        category: editingProduct.category?.trim().toLowerCase() || null,
        price,
        cost_buy,
        price_major,
        stock: stock || stock_actual,
        stock_actual,
        provider_name: editingProduct.provider_name?.trim() || null,
        barcode: editingProduct.barcode?.trim() || null,
        qr_code: editingProduct.qr_code?.trim() || null,
        is_active: true,
      };

      if (editingProduct.id) {
        await inventoryApi.update(editingProduct.id, payload);
        toast.success("Producto actualizado con éxito", { id: loadingToast });
      } else {
        await inventoryApi.create(payload);
        toast.success("Producto creado con éxito", { id: loadingToast });
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      await refetch();
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error?.response?.data?.error ||
        error?.message ||
        "Error al procesar la solicitud";
      toast.error(errorMsg, { id: loadingToast });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await inventoryApi.delete(id);
      toast.success("Producto eliminado");
      refetch();
    } catch (error) {
      toast.error("Error al eliminar el producto");
    }
  };

  const exportToExcel = () => {
    const productList = Array.isArray(products) ? products : [];
    const dataToExport = productList.map((p) => ({
      Nombre: p.name,
      Marca: p.brand || "N/A",
      Categoría: p.category || "General",
      Proveedor: p.providers?.name || "Sin Proveedor",
      Precio: p.price,
      Costo: p.cost_buy,
      Stock: p.stock_actual,
      Código: p.barcode || "S/C",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario_TiendasJhared.xlsx");
  };

  if (loading && (!products || products.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="text-brand-500 animate-pulse font-black text-xl">
          Sincronizando Inventario...
        </div>
      </div>
    );
  }
  console.log("Proveedores cargados:", providers);

  return (
    <div className="p-6 bg-[#0a0a0c] min-h-screen text-white">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-dark-900/50 p-6 rounded-3xl border border-white/5">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 text-white">
            <Package className="text-brand-500" size={32} /> Control de
            Inventario
          </h1>
          <p className="text-dark-400 text-sm">
            Administra productos y niveles de stock de Tiendas JHARED
          </p>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0">
          {/* Input de archivo oculto para la importación */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
          />

          {/* Botón Importar */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-dark-300"
            title="Importar Excel"
          >
            <Upload size={20} />
          </button>

          {/* Botón Exportar */}
          <button
            onClick={exportToExcel}
            className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-dark-300"
            title="Exportar Excel"
          >
            <Download size={20} />
          </button>

          {/* Botón Nuevo Producto */}
          <button
            onClick={() => {
              setEditingProduct({
                name: "",
                brand: "",
                category: "",
                price: "",
                cost_buy: "",
                price_major: "",
                stock: "",
                stock_actual: "",
                stock_sold: "0",
                sale_percentage: "0",
                provider_name: "",
                barcode: "",
                qr_code: "",
                is_active: true,
              });
              setIsModalOpen(true);
            }}
            className="bg-brand-600 hover:bg-brand-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-600/20 text-white"
          >
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="relative mb-6">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500"
          size={20}
        />
        <input
          type="text"
          placeholder="Buscar por nombre, marca, código de barras o proveedor..."
          className="w-full bg-dark-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-brand-500 outline-none transition-all text-white placeholder:text-dark-600"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="bg-dark-900/30 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-dark-400 text-xs uppercase font-black">
                <th className="p-5">Producto / Marca</th>
                <th className="p-5">Categoría</th>
                <th className="p-5">Proveedor</th>
                <th className="p-5">Finanzas</th>
                <th className="p-5">Stock</th>
                <th className="p-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-dark-500 font-medium"
                  >
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-5">
                      <div className="font-bold text-white group-hover:text-brand-400 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-xs text-dark-500 flex gap-2 items-center">
                        <span className="font-mono bg-dark-800 px-1 rounded">
                          {p.barcode || "S/C"}
                        </span>
                        {p.brand && <span>• {formatToTitleCase(p.brand)}</span>}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-white/10 text-dark-300">
                        {formatToTitleCase(p.category)}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-sm text-dark-300 font-medium">
                        {p.providers?.name || "—"}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="text-emerald-400 font-black">
                        S/. {Number(p.price).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-dark-500">
                        Costo: S/. {Number(p.cost_buy).toFixed(2)}
                      </div>
                    </td>
                    {/* TABLA -> Fila de Producto -> Columna de Stock */}
                    <td className="p-5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg font-mono font-bold bg-emerald-500/10 text-emerald-500">
                        {p.stock_actual}
                      </div>
                      <div className="mt-2 w-28">
                        <div className="flex justify-between text-[10px] text-dark-400 font-medium mb-1">
                          <span>Rotación:</span>
                          <span className="font-bold text-brand-400">
                            {(() => {
                              const totalStock =
                                Number(p.stock) ||
                                Number(p.stock_actual) +
                                  Number(p.stock_sold || 0);
                              const rotation =
                                totalStock > 0
                                  ? Math.round(
                                      (Number(p.stock_sold || 0) / totalStock) *
                                        100,
                                    )
                                  : 0;
                              return rotation;
                            })()}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(() => {
                                const totalStock =
                                  Number(p.stock) ||
                                  Number(p.stock_actual) +
                                    Number(p.stock_sold || 0);
                                const rotation =
                                  totalStock > 0
                                    ? Math.round(
                                        (Number(p.stock_sold || 0) /
                                          totalStock) *
                                          100,
                                      )
                                    : 0;
                                return Math.min(rotation, 100);
                              })()}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingProduct({
                              ...p,
                              price: String(p.price),
                              cost_buy: String(p.cost_buy),
                              price_major: String(p.price_major || ""),
                              stock_actual: String(p.stock_actual),
                              stock: String(p.stock || p.stock_actual),
                              provider_name: p.providers?.name || "", // Conversion del string real al input editable
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id!)}
                          className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
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

      {/* MODAL DE PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="bg-[#111317] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="bg-brand-600 p-6 flex justify-between items-center">
              <h2 className="text-xl font-black text-white">
                {editingProduct?.id ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="col-span-2">
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Nombre del Producto *
                </label>
                <input
                  autoFocus
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 transition-all text-white"
                  value={editingProduct?.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ej. Samsung Galaxy S25 FE"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Precio Venta (S/.) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 text-white"
                  value={editingProduct?.price ?? ""}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Costo Compra (S/.) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 text-white"
                  value={editingProduct?.cost_buy ?? ""}
                  onChange={(e) =>
                    handleInputChange("cost_buy", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Precio Mayorista (S/.)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 text-white"
                  value={editingProduct?.price_major ?? ""}
                  onChange={(e) =>
                    handleInputChange("price_major", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Stock Actual *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 text-white"
                  value={editingProduct?.stock_actual ?? ""}
                  onChange={(e) =>
                    handleInputChange("stock_actual", e.target.value)
                  }
                  placeholder="0"
                />
              </div>

              {/* --- SECCIÓN DE SELECTS Y CÓDIGO --- */}
              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Marca
                </label>
                <Combobox
                  options={brandOptions.map((b) => ({ name: b }))}
                  value={editingProduct?.brand || ""}
                  onChange={(val) => handleInputChange("brand", val)}
                  placeholder="Selecciona o escribe una marca..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Categoría
                </label>
                <Combobox
                  options={categoryOptions.map((c) => ({ name: c }))}
                  value={editingProduct?.category || ""}
                  onChange={(val) => handleInputChange("category", val)}
                  placeholder="Selecciona o escribe una categoría..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Código de Barras
                </label>
                <input
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 text-white"
                  value={editingProduct?.barcode || ""}
                  onChange={(e) => handleInputChange("barcode", e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-dark-500 uppercase tracking-wider">
                  Proveedor del Producto
                </label>
                <Combobox
                  // los proveedores pasan como 'options'
                  options={providers.map((p) => ({ name: p.name }))}
                  value={editingProduct?.provider_name || ""}
                  onChange={(val) => handleInputChange("provider_name", val)}
                  placeholder="Selecciona un proveedor..."
                />
                <p className="text-[11px] text-dark-500 mt-1">
                  Si el proveedor no está en la lista, puedes escribirlo
                  directamente.
                </p>
              </div>

              {/* --- BOTONES DE ACCIÓN --- */}
              <div className="col-span-2 flex gap-4 mt-4 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-dark-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-brand-600 hover:bg-brand-500 py-3 rounded-xl font-black text-white shadow-lg shadow-brand-600/20 transition-all"
                >
                  {editingProduct?.id
                    ? "Actualizar Producto"
                    : "Registrar Producto"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
