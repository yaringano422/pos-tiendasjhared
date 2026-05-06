import { useEffect, useState } from "react";
import { salesApi, inventoryApi } from "../services/api"; // Usando tus servicios
import { ShoppingCart, User, DollarSign, Package } from "lucide-react";
import toast from "react-hot-toast";
import { Product } from "@/types";

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    customer_name: "Público General",
    quantity: 1,
    metodo_pago: "Efectivo",
    modo_precio: "normal",
    precio_personalizado: 0,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await inventoryApi.getAll();
      setProducts(data);
    } catch (error) {
      toast.error("Error al cargar productos");
    }
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // El backend recibe esto y SalesService.registerSale hace el resto
      await salesApi.create(formData);
      toast.success("Venta registrada correctamente");
      setFormData({ ...formData, quantity: 1, product_id: "" });
      loadProducts(); // Recargar para ver stock actualizado
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error en la venta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-brand-500/10 p-3 rounded-lg">
          <ShoppingCart className="text-brand-400" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white">Nueva Venta</h1>
      </div>

      <form
        onSubmit={handleSale}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-800 p-6 rounded-xl border border-dark-700"
      >
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Package size={14} /> Producto
          </label>
          <select
            className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white outline-none focus:border-brand-500"
            value={formData.product_id}
            onChange={(e) =>
              setFormData({ ...formData, product_id: e.target.value })
            }
            required
          >
            <option value="">Seleccione un producto...</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} (Stock: {p.stock_actual})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <User size={14} /> Nombre del Cliente
          </label>
          <input
            type="text"
            className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white outline-none focus:border-brand-500"
            value={formData.customer_name}
            onChange={(e) =>
              setFormData({ ...formData, customer_name: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Modo de Facturación</label>
          <select
            className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white outline-none focus:border-brand-500"
            value={formData.modo_precio}
            onChange={(e) =>
              setFormData({ ...formData, modo_precio: e.target.value })
            }
          >
            <option value="normal">Precio Normal</option>
            <option value="mayorista">Precio Mayorista</option>
            <option value="personalizado">Precio Personalizado</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-gray-400">Cantidad</label>
            <input
              type="number"
              min="1"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white outline-none focus:border-brand-500"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm text-gray-400">Pago</label>
            <select
              className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white outline-none focus:border-brand-500"
              value={formData.metodo_pago}
              onChange={(e) =>
                setFormData({ ...formData, metodo_pago: e.target.value })
              }
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Yape/Plin">Yape/Plin</option>
            </select>
          </div>
        </div>

        <button
          disabled={loading}
          className="md:col-span-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg shadow-brand-500/20"
        >
          <DollarSign size={20} />{" "}
          {loading ? "Procesando..." : "Registrar Venta"}
        </button>
      </form>
    </div>
  );
}
