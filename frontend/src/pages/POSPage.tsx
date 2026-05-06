import { useEffect, useState, useRef } from "react";
import { useCartStore } from "../store/cartStore";
import { useProducts } from "../hooks/useProducts";
import { useAuthStore } from "../store/authStore";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  X,
  Smartphone,
  CheckCircle2,
  CreditCard,
  Banknote,
  Layers,
  Layout,
  Calculator,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import type { Product } from "../types";

export default function POSPage() {
  // 1. Datos y Hook de productos
  const { products, categories, loading, refetch } = useProducts();

  // 2. Estados de UI
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [customerName, setCustomerName] = useState("Público General");

  // 3. Estados de Pago (UNIFICADOS - Corregido error de redeclaración)
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "mixto"
  >("efectivo");
  const [pagoEfectivo, setPagoEfectivo] = useState(0);
  const [pagoTarjeta, setPagoTarjeta] = useState(0);

  const cart = useCartStore();
  const total = cart.getTotal();

  // 4. Lógica de Escáner (Barcode/QR)
  const barcodeBuffer = useRef("");
  // Referencia tipada para evitar conflictos entre NodeJS y Browser
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar que el escáner capture datos si el usuario está en un input que no es el buscador principal
      const activeEl = document.activeElement as HTMLInputElement;
      if (
        activeEl?.tagName === "INPUT" &&
        activeEl.placeholder !== "Escanear código o buscar producto..."
      ) {
        return;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 3) {
          const code = barcodeBuffer.current.trim();
          const found = products.find(
            (p) => p.barcode === code || p.qr_code === code,
          );

          if (found) {
            handleAddToCart(found);
            setSearch("");
          } else {
            toast.error("Producto no encontrado", { id: "scan-error" });
          }
          barcodeBuffer.current = "";
        }
      } else {
        if (e.key.length === 1) {
          barcodeBuffer.current += e.key;
        }
      }

      timeoutRef.current = setTimeout(() => {
        barcodeBuffer.current = "";
      }, 150);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [products]);

  // 5. Sincronización automática de montos
  useEffect(() => {
    if (metodoPago === "efectivo") {
      setPagoEfectivo(total);
      setPagoTarjeta(0);
    } else if (metodoPago === "tarjeta") {
      setPagoEfectivo(0);
      setPagoTarjeta(total);
    } else if (metodoPago === "mixto") {
      if (pagoEfectivo === 0 && pagoTarjeta === 0) {
        setPagoEfectivo(total / 2);
        setPagoTarjeta(total / 2);
      }
    }
  }, [metodoPago, total]);

  // 6. Helpers
  const formatCurrency = (val: number) =>
    `S/ ${val.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  const filteredProducts = products.filter(
    (p) =>
      (!activeCategory || p.category === activeCategory) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase())),
  );

  const handleAddToCart = (product: Product) => {
    const isService =
      product.category?.toLowerCase().includes("servicio") ||
      product.category?.toLowerCase().includes("reparación");

    if (!isService && product.stock_actual <= 0) {
      toast.error("Producto sin stock");
      return;
    }

    cart.addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      modo_precio: "normal",
      stock_disponible: isService ? 999 : product.stock_actual,
    });

    toast.success(`${product.name} añadido`, {
      position: "bottom-center",
      duration: 800,
    });
  };

  // 7. Lógica de Impresión
  const printTicket = (saleData: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Logo en Base64 (Reemplazar por el real si se dispone de él)
    const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";

    const subtotalSinImpuesto = saleData.total_price / 1.18;
    const igv = saleData.total_price - subtotalSinImpuesto;

    const ticketHtml = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 75mm; padding: 3mm; font-size: 11px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .table { width: 100%; border-collapse: collapse; }
            .text-right { text-align: right; }
            .logo { max-width: 50mm; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <img src="${logoBase64}" class="logo" alt="Logo" /><br/>
            <span class="bold" style="font-size: 14px;">TIENDAS JHARED</span><br/>
            RUC: 20600000000<br/>
            Av. Principal 123 - Lima<br/>
            Tel: 987 654 321
          </div>

          <div class="divider"></div>
          <div>
            FECHA: ${new Date().toLocaleString()}<br/>
            CLIENTE: ${saleData.customer_name || "PÚBLICO GENERAL"}<br/>
            METODO: ${saleData.metodo_pago.toUpperCase()}
          </div>
          <div class="divider"></div>

          <table class="table">
            <thead>
              <tr>
                <th align="left">CANT/DESCRIP</th>
                <th align="right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${saleData.items
                .map(
                  (item: any) => `
                <tr>
                  <td colspan="2">${item.name}</td>
                </tr>
                <tr>
                  <td>${item.quantity} x ${item.price.toFixed(2)}</td>
                  <td class="text-right">${item.subtotal.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="divider"></div>
          <table class="table">
            <tr>
              <td>OP. GRAVADA:</td>
              <td class="text-right">S/ ${subtotalSinImpuesto.toFixed(2)}</td>
            </tr>
            <tr>
              <td>IGV (18%):</td>
              <td class="text-right">S/ ${igv.toFixed(2)}</td>
            </tr>
            <tr class="bold" style="font-size: 14px;">
              <td>TOTAL A PAGAR:</td>
              <td class="text-right">S/ ${saleData.total_price.toFixed(2)}</td>
            </tr>
          </table>

          <div class="divider"></div>
          <p class="text-center">¡GRACIAS POR SU COMPRA!<br/>Representación impresa de boleta electrónica</p>
          
          <script>
            window.onload = () => { 
              window.print(); 
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(ticketHtml);
    printWindow.document.close();
  };

  // 8. Confirmar Venta
  const handleConfirmSale = async () => {
    if (cart.items.length === 0) return;

    const loadingToast = toast.loading("Procesando venta...");

    try {
      const token = useAuthStore.getState().token;
      const subtotalBase = cart.getTotal() / 1.18;
      const igvCalculado = cart.getTotal() - subtotalBase;

      if (!token) {
        toast.error("Sesión expirada", { id: loadingToast });
        useAuthStore.getState().logout();
        return;
      }

      if (
        metodoPago === "mixto" &&
        Math.abs(pagoEfectivo + pagoTarjeta - total) > 0.01
      ) {
        toast.error("La suma de pagos no coincide con el total", {
          id: loadingToast,
        });
        return;
      }

      const saleData = {
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          modo_precio: item.modo_precio || "normal",
        })),
        metodo_pago: metodoPago,
        pago_efectivo: metodoPago === "tarjeta" ? 0 : pagoEfectivo,
        pago_tarjeta: metodoPago === "efectivo" ? 0 : pagoTarjeta,
        comision_tarjeta: cart.getCommisionCard(),
        subtotal: cart.getSubtotal(),
        total_price: total,
        customer_name: customerName.trim() || "PÚBLICO GENERAL",
        igv: igvCalculado,
        subtotal_neto: subtotalBase,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error || "Error en el servidor");
      }

      const result = await response.json();
      toast.success("Venta completada", { id: loadingToast });

      printTicket({
        ...saleData,
        id: result.id,
      });

      // Limpieza de estado post-venta
      cart.clearCart();
      setPagoEfectivo(0);
      setPagoTarjeta(0);
      setCustomerName("Público General");
      refetch();
      setShowMobileCart(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "No se pudo registrar la venta", {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] animate-in fade-in duration-500 text-white">
      {/* SECCIÓN IZQUIERDA: PRODUCTOS */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 space-y-4">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Escanear código o buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-900/50 border border-dark-700 text-white pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-brand-500 transition-all"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={clsx(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all border-b-4 flex items-center whitespace-nowrap",
                !activeCategory
                  ? "bg-brand-600 border-brand-800 text-white"
                  : "bg-dark-800 border-transparent text-dark-400 hover:bg-dark-700",
              )}
            >
              <Layout size={16} className="mr-2" /> Todos
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all border-b-4 whitespace-nowrap",
                  activeCategory === cat.id
                    ? "text-white shadow-lg shadow-black/20"
                    : "bg-dark-800 text-dark-400 border-transparent hover:bg-dark-700",
                )}
                style={
                  activeCategory === cat.id
                    ? {
                        backgroundColor: cat.color,
                        borderColor: "rgba(0,0,0,0.2)",
                      }
                    : {}
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 pr-2 custom-scrollbar">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className={clsx(
                "group bg-dark-900/40 border p-4 rounded-2xl transition-all cursor-pointer active:scale-95 flex flex-col justify-between min-h-[160px]",
                product.stock_actual > 0
                  ? "border-dark-800 hover:border-brand-500/50 shadow-lg hover:shadow-brand-500/5"
                  : "opacity-50 grayscale cursor-not-allowed",
              )}
            >
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm line-clamp-2 leading-tight group-hover:text-brand-400">
                    {product.name}
                  </h3>
                  <div className="bg-brand-500/10 p-1.5 rounded-lg ml-2 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <Plus size={14} />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 bg-dark-800 rounded-full text-dark-400 uppercase font-medium">
                    {product.brand || "Genérico"}
                  </span>
                  <span
                    className={clsx(
                      "text-[10px] font-bold flex items-center gap-1",
                      product.stock_actual < 5
                        ? "text-red-400"
                        : "text-emerald-400",
                    )}
                  >
                    <Layers size={10} /> {product.stock_actual}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex justify-between items-end">
                <span className="text-lg font-black text-white">
                  {formatCurrency(product.price)}
                </span>
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border border-dark-700 shadow-lg"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIDEBAR DERECHA: CARRITO Y PAGO */}
      <aside
        className={clsx(
          "fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex w-full lg:w-[400px] bg-dark-950 lg:bg-dark-900/20 border-l border-dark-800 flex flex-col transition-transform duration-300",
          showMobileCart
            ? "translate-x-0"
            : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-5 border-b border-dark-800 flex justify-between items-center bg-dark-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <ShoppingBag className="text-brand-500" size={20} />
            </div>
            <h2 className="font-bold text-lg">Carrito de Venta</h2>
          </div>
          <button
            onClick={() => setShowMobileCart(false)}
            className="lg:hidden text-dark-400 hover:text-white"
          >
            <X />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dark-600 opacity-40">
              <Smartphone size={64} className="mb-4" />
              <p className="text-sm font-medium">Escanear o buscar productos</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.product_id}
                className="bg-dark-800/40 rounded-2xl p-4 border border-dark-700/30"
              >
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-semibold flex-1 pr-2">
                    {item.name}
                  </span>
                  <button
                    onClick={() => cart.removeItem(item.product_id)}
                    className="text-dark-500 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-dark-950/50 rounded-xl p-1 border border-dark-700">
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.product_id, item.quantity - 1)
                      }
                      className="p-1 hover:text-brand-400 text-dark-400"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-mono font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.product_id, item.quantity + 1)
                      }
                      className="p-1 hover:text-brand-400 text-dark-400"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-brand-400">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="p-6 bg-dark-900/80 border-t border-dark-700 space-y-5 shadow-2xl">
            {/* CLIENTE */}
            <div className="space-y-1">
              <label className="text-[10px] text-dark-400 ml-1 font-bold">
                CLIENTE
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm outline-none focus:border-brand-500 text-white"
              />
            </div>

            {/* MÉTODOS DE PAGO */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "efectivo", icon: Banknote, label: "Efectivo" },
                { id: "tarjeta", icon: CreditCard, label: "Tarjeta" },
                { id: "mixto", icon: Calculator, label: "Mixto" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetodoPago(m.id as any)}
                  className={clsx(
                    "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    metodoPago === m.id
                      ? "border-brand-500 bg-brand-500/10 text-brand-400"
                      : "border-dark-700 text-dark-500",
                  )}
                >
                  <m.icon size={18} />
                  <span className="text-[10px] font-bold uppercase">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {/* INPUTS PAGO MIXTO */}
            {metodoPago === "mixto" && (
              <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-400 font-bold ml-1">
                    EFECTIVO
                  </label>
                  <input
                    type="number"
                    value={pagoEfectivo}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPagoEfectivo(val);
                      setPagoTarjeta(Math.max(0, cart.getTotal() - val));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-400 font-bold ml-1">
                    TARJETA (+5%)
                  </label>
                  <input
                    type="number"
                    value={pagoTarjeta}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPagoTarjeta(val);
                      setPagoEfectivo(Math.max(0, cart.getTotal() - val));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm text-white outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* TOTALES */}
            <div className="space-y-2 border-t border-dark-700 pt-3">
              <div className="flex justify-between text-sm text-dark-400">
                <span>Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(cart.getSubtotal())}
                </span>
              </div>
              {metodoPago !== "efectivo" && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Comisión Tarjeta (5%)</span>
                  <span className="font-mono">
                    {formatCurrency(cart.getCommisionCard())}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black pt-2">
                <span>Total</span>
                <span className="text-brand-500 font-mono">
                  {formatCurrency(cart.getTotal())}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmSale}
              disabled={cart.items.length === 0}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-brand-900/20"
            >
              <CheckCircle2 size={22} />
              <span>Finalizar Venta</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
