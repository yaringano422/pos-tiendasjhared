import { useEffect, useState } from "react";
import { purchasesApi, inventoryApi } from "../services/api";
import type { Product } from "../types";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Search,
  FileText,
  Hash,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

interface CartItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  igv: number;
  total: number;
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Basado en los campos de la UI de Python[cite: 2]
  const [formData, setFormData] = useState({
    provider_id: 1,
    document_type: "01 Factura Electrónica (FE)",
    document_number: "",
    payment_type: "Efectivo",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await inventoryApi.getAll();

      const data = Array.isArray(response) ? response : (response as any).data;

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setProducts([]);
      toast.error("Error al cargar productos.");
    }
  };

  const calculateItemValues = (quantity: number, price: number) => {
    const total = quantity * price;
    const igv = total * 0.18;
    const subtotal = total - igv;
    return { subtotal, igv, total };
  };

  const addToCart = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (cart.find((item) => item.product_id === productId)) {
      return toast.error("El producto ya está en la lista.");
    }

    const price = product.cost_buy || 0;
    const values = calculateItemValues(1, price);

    setCart([
      ...cart,
      {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: price,
        ...values,
      },
    ]);
  };

  const updateCartItem = (
    index: number,
    field: "quantity" | "unit_price",
    value: number,
  ) => {
    const newCart = [...cart];
    const item = { ...newCart[index], [field]: value };

    const { subtotal, igv, total } = calculateItemValues(
      item.quantity,
      item.unit_price,
    );

    newCart[index] = { ...item, subtotal, igv, total };
    setCart(newCart);
  };

  const handleRegister = async () => {
    if (cart.length === 0) return toast.error("Agrega productos a la compra.");
    if (!formData.document_number)
      return toast.error("Ingresa el número de documento.");

    setLoading(true);
    try {
      const requestData = {
        ...formData,
        details: cart.map(({ name, subtotal, igv, total, ...rest }) => rest),
      };

      await purchasesApi.create(requestData);
      toast.success("¡Compra registrada exitosamente!");
      setCart([]);
      setFormData({ ...formData, document_number: "" });
    } catch (error) {
      toast.error("Error al registrar la compra.");
    } finally {
      setLoading(false);
    }
  };

  // Totales generales[cite: 2]
  const globalSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const globalIgv = cart.reduce((sum, item) => sum + item.igv, 0);
  const globalTotal = cart.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="p-6 space-y-6 text-white bg-dark-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/20 p-2 rounded-lg">
            <ShoppingCart className="text-brand-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            Registro de Compras
          </h1>
        </div>
        <button
          onClick={loadProducts}
          className="text-gray-400 hover:text-brand-400 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* PANEL IZQUIERDO: CABECERA[cite: 2] */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-dark-800 border border-dark-700 p-5 rounded-xl space-y-4 shadow-xl">
            <h2 className="font-semibold flex items-center gap-2 border-b border-dark-700 pb-2 text-brand-400">
              <FileText size={18} /> Datos del Comprobante
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">
                  Tipo Documento
                </label>
                <select
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2.5 text-sm mt-1 focus:border-brand-500 outline-none transition-all"
                  value={formData.document_type}
                  onChange={(e) =>
                    setFormData({ ...formData, document_type: e.target.value })
                  }
                >
                  <option>01 Factura Electrónica (FE)</option>
                  <option>03 Boleta de Venta</option>
                  <option>07 Nota de Crédito</option>
                  <option>08 Nota de Débito</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">
                  N° Documento
                </label>
                <div className="relative mt-1">
                  <Hash
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={14}
                  />
                  <input
                    type="text"
                    className="w-full bg-dark-900 border border-dark-600 rounded p-2.5 pl-9 text-sm focus:border-brand-500 outline-none transition-all"
                    placeholder="F001-000123"
                    value={formData.document_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        document_number: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">
                  Método de Pago
                </label>
                <div className="relative mt-1">
                  <CreditCard
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={14}
                  />
                  <select
                    className="w-full bg-dark-900 border border-dark-600 rounded p-2.5 pl-9 text-sm focus:border-brand-500 outline-none transition-all"
                    value={formData.payment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_type: e.target.value })
                    }
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Crédito</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 p-5 rounded-xl space-y-4 shadow-xl">
            <h2 className="font-semibold flex items-center gap-2 border-b border-dark-700 pb-2 text-orange-400">
              <Plus size={18} /> Buscar Productos
            </h2>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={14}
              />
              <select
                className="w-full bg-brand-500/10 border border-brand-500/30 rounded p-2.5 pl-9 text-sm text-brand-400 outline-none cursor-pointer"
                onChange={(e) => addToCart(Number(e.target.value))}
                value=""
              >
                <option value="" disabled className="bg-dark-900">
                  Seleccionar producto...
                </option>

                {Array.isArray(products) && products.length > 0 ? (
                  products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-dark-900">
                      {p.name} (Stock: {p.stock_actual})
                    </option>
                  ))
                ) : (
                  <option disabled className="bg-dark-900">
                    No hay productos disponibles
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: DETALLES Y TOTALES[cite: 2] */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden shadow-xl flex-1">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-dark-800 shadow-sm">
                  <tr className="text-gray-400 border-b border-dark-700 text-xs uppercase tracking-wider">
                    <th className="p-4">Producto</th>
                    <th className="p-4 text-center w-28">Cantidad</th>
                    <th className="p-4 text-center w-36">Costo Unit.</th>
                    <th className="p-4 text-right">IGV (18%)</th>
                    <th className="p-4 text-right">Subtotal</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {cart.map((item, index) => (
                    <tr
                      key={item.product_id}
                      className="hover:bg-dark-700/30 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="text-sm font-medium text-white">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          ID: {item.product_id}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="1"
                          className="w-full bg-dark-900 border border-dark-600 rounded py-1.5 text-center text-sm outline-none focus:border-brand-500"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartItem(
                              index,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center bg-dark-900 border border-dark-600 rounded px-2">
                          <span className="text-xs text-gray-500 mr-1">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full bg-transparent border-none py-1.5 text-center text-sm outline-none"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateCartItem(
                                index,
                                "unit_price",
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="p-4 text-right text-sm text-gray-400">
                        {item.igv.toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-sm font-bold text-brand-400">
                        S/ {item.total.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() =>
                            setCart(cart.filter((_, i) => i !== index))
                          }
                          className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-20 text-center text-gray-500 italic text-sm"
                      >
                        No hay productos en el detalle. Use el buscador para
                        agregar ítems.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* DESGLOSE DE TOTALES FINAL[cite: 2] */}
            <div className="bg-dark-900/50 p-6 border-t border-dark-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="text-center md:text-left">
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Subtotal
                </p>
                <p className="text-lg font-semibold text-gray-300">
                  S/ {globalSubtotal.toFixed(2)}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  IGV (18%)
                </p>
                <p className="text-lg font-semibold text-gray-300">
                  S/ {globalIgv.toFixed(2)}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] text-brand-400 uppercase font-bold">
                  Total a Pagar
                </p>
                <p className="text-2xl font-black text-white">
                  S/ {globalTotal.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleRegister}
                  disabled={loading || cart.length === 0}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 text-white px-10 py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Save size={20} /> Registrar Ingreso
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
