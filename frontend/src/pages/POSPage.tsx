import React, { useEffect, useState, useRef, useMemo } from "react";
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
  FileText,
  RefreshCw,
  Calendar,
  Tag,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import type { Product, PriceMode } from "../types";

const ITEMS_PER_PAGE = 12;

export default function POSPage() {
  const { products, categories, loading, refetch } = useProducts();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [customerName, setCustomerName] = useState("Público General");

  const [tipoTransaccion, setTipoTransaccion] = useState<
    "venta" | "cotizacion" | "devolucion" | "reserva"
  >("venta");
  const [tipoVenta, setTipoVenta] = useState<PriceMode>("menor");

  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "mixto" | "yape_plin" | "transferencia"
  >("efectivo");
  const [pagoEfectivo, setPagoEfectivo] = useState(0);
  const [pagoTarjeta, setPagoTarjeta] = useState(0);
  const [comisionTransferencia, setComisionTransferencia] = useState<number>(0);

  const cart = useCartStore();
  const total = cart.getTotal();

  // Reset de página al filtrar o buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  const barcodeBuffer = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  useEffect(() => {
    const extraTransferencia =
      metodoPago === "transferencia" && comisionTransferencia > 0
        ? Number((total * (comisionTransferencia / 100)).toFixed(2))
        : 0;

    const totalConComision =
      total + cart.getCommisionCard() + extraTransferencia;

    if (metodoPago === "efectivo" || metodoPago === "yape_plin") {
      setPagoEfectivo(total);
      setPagoTarjeta(0);
    } else if (metodoPago === "transferencia") {
      setPagoEfectivo(totalConComision);
      setPagoTarjeta(0);
    } else if (metodoPago === "tarjeta") {
      setPagoTarjeta(totalConComision);
      setPagoEfectivo(0);
    } else if (metodoPago === "mixto") {
      setPagoEfectivo(Number((totalConComision / 2).toFixed(2)));
      setPagoTarjeta(Number((totalConComision / 2).toFixed(2)));
    }
  }, [metodoPago, total, comisionTransferencia]);

  const formatCurrency = (val: number) =>
    `S/ ${val.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  // Filtrado optimizado con useMemo
  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        (!activeCategory || p.category === activeCategory) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.brand?.toLowerCase().includes(search.toLowerCase())),
    );
  }, [products, activeCategory, search]);

  // Paginación calculada
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleAddToCart = (product: Product) => {
    const isService =
      product.category?.toLowerCase().includes("servicio") ||
      product.category?.toLowerCase().includes("reparación");

    if (!isService && product.stock_actual <= 0) {
      toast.error("Producto sin stock");
      return;
    }

    const precioNormal = Number(product.price);
    const precioMayor = Number(product.price_major || product.price);

    const precioAplicado =
      tipoVenta === "mayorista" ? precioMayor : precioNormal;

    cart.addItem({
      product_id: product.id,
      name: product.name,
      price: precioAplicado,
      price_normal: precioNormal,
      price_major: precioMayor,
      quantity: 1,
      modo_precio: tipoVenta,
      stock_disponible: isService ? 999 : product.stock_actual,
    } as any);

    toast.success(`${product.name} añadido`, {
      position: "bottom-center",
      duration: 800,
    });
  };

  const handleConfirmSale = async () => {
    if (cart.items.length === 0) return;

    const loadingToast = toast.loading("Procesando venta...");

    try {
      const token = useAuthStore.getState().token;

      if (!token) {
        toast.error("Sesión expirada", { id: loadingToast });
        useAuthStore.getState().logout();
        return;
      }

      const totalCarrito = cart.getTotal();

      const extraTransferencia =
        metodoPago === "transferencia" && comisionTransferencia > 0
          ? Number((totalCarrito * (comisionTransferencia / 100)).toFixed(2))
          : 0;

      const totalFinalVenta =
        metodoPago === "tarjeta" || metodoPago === "mixto"
          ? totalCarrito + cart.getCommisionCard()
          : totalCarrito + extraTransferencia;

      const subtotalBase = Number((totalFinalVenta / 1.18).toFixed(2));
      const igvCalculado = Number((totalFinalVenta - subtotalBase).toFixed(2));

      const saleData = {
        tipo_transaccion: tipoTransaccion,
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: Number((item.price * item.quantity).toFixed(2)),
          modo_precio: tipoVenta,
        })),
        metodo_pago: metodoPago,
        pago_efectivo:
          metodoPago === "efectivo"
            ? totalFinalVenta
            : metodoPago === "mixto"
              ? pagoEfectivo
              : 0,
        pago_tarjeta:
          metodoPago === "tarjeta"
            ? totalFinalVenta
            : metodoPago === "mixto"
              ? pagoTarjeta
              : 0,
        pago_transferencia:
          metodoPago === "transferencia" ? totalFinalVenta : 0,
        comision_tarjeta:
          metodoPago === "tarjeta" || metodoPago === "mixto"
            ? cart.getCommisionCard()
            : extraTransferencia,
        subtotal: cart.getSubtotal(),
        total_price: totalFinalVenta,
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

      toast.success("Venta completada", { id: loadingToast });

      cart.clearCart();
      setPagoEfectivo(0);
      setPagoTarjeta(0);
      setComisionTransferencia(0);
      setCustomerName("Público General");
      setTipoTransaccion("venta");
      setTipoVenta("menor");
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

  const calculatedTotal =
    metodoPago === "tarjeta" || metodoPago === "mixto"
      ? cart.getTotal() + cart.getCommisionCard()
      : metodoPago === "transferencia"
        ? cart.getTotal() +
          Number((total * (comisionTransferencia / 100)).toFixed(2))
        : cart.getTotal();

  return (
    <div className="relative flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] text-white overflow-hidden">
      {/* SECCIÓN IZQUIERDA: PRODUCTOS Y PAGINACIÓN */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* BUSCADOR Y FILTROS */}
        <div className="mb-4 space-y-3 shrink-0">
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
              className="w-full bg-dark-900/50 border border-dark-700 text-white pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-brand-500 transition-all text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center whitespace-nowrap",
                !activeCategory
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                  : "bg-dark-800 text-dark-400 hover:bg-dark-700",
              )}
            >
              <Layout size={14} className="mr-1.5" /> Todos
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeCategory === cat.id
                    ? "text-white shadow-md"
                    : "bg-dark-800 text-dark-400 hover:bg-dark-700",
                )}
                style={
                  activeCategory === cat.id
                    ? { backgroundColor: cat.color || "#2563eb" }
                    : {}
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* CATÁLOGO EN GRID CON ALTURA Y TAMAÑO FIJO */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[140px]">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className={clsx(
                  "group bg-dark-900/40 border p-3 rounded-2xl transition-all cursor-pointer active:scale-95 flex flex-col justify-between h-[140px]",
                  product.stock_actual > 0
                    ? "border-dark-800 hover:border-brand-500/50 shadow-md hover:shadow-brand-500/5"
                    : "opacity-50 grayscale cursor-not-allowed",
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-xs line-clamp-2 leading-tight group-hover:text-brand-400">
                      {product.name}
                    </h3>
                    <div className="bg-brand-500/10 p-1 rounded-lg ml-1 group-hover:bg-brand-500 group-hover:text-white transition-colors shrink-0">
                      <Plus size={12} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 bg-dark-800 rounded-md text-dark-400 uppercase font-medium">
                      {product.brand || "Genérico"}
                    </span>
                    <span
                      className={clsx(
                        "text-[9px] font-bold flex items-center gap-0.5",
                        product.stock_actual < 5
                          ? "text-red-400"
                          : "text-emerald-400",
                      )}
                    >
                      <Layers size={9} /> {product.stock_actual}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex justify-between items-end">
                  <span className="text-base font-black text-white font-mono">
                    {formatCurrency(product.price)}
                  </span>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover border border-dark-700 shadow shrink-0"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BARRA DE PAGINACIÓN */}
        <div className="mt-3 pt-2 border-t border-dark-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-dark-400 font-medium">
            Mostrando <span className="text-white font-bold">{paginatedProducts.length}</span> de <span className="text-white font-bold">{filteredProducts.length}</span> productos
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 bg-dark-800 hover:bg-dark-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono px-2 text-dark-300">
              Pág. {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 bg-dark-800 hover:bg-dark-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* BOTÓN FLOTANTE PARA MÓVIL CUANDO HAY PRODUCTOS */}
      {cart.items.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl shadow-brand-600/50 border border-brand-400/30 active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 bg-white/10 rounded-xl">
                <ShoppingBag size={20} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.items.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </div>
              <span className="text-sm font-bold">Ver Carrito</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono">
                {formatCurrency(calculatedTotal)}
              </span>
              <ChevronUp size={20} />
            </div>
          </button>
        </div>
      )}

      {/* PANEL DERECHO: CARRITO Y TRANSACCIONES (ESTRUCTURA CORREGIDA) */}
      <aside
        className={clsx(
          "fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex w-full lg:w-[410px] bg-dark-950 lg:bg-dark-900/40 border-l border-dark-800/80 flex flex-col h-full transition-all duration-300",
          showMobileCart
            ? "translate-y-0 opacity-100"
            : "translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto",
        )}
      >
        {/* ENCABEZADO DEL CARRITO */}
        <div className="p-4 border-b border-dark-800 flex justify-between items-center bg-dark-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <ShoppingBag className="text-brand-500" size={18} />
            </div>
            <h2 className="font-bold text-base">Carrito de Venta</h2>
          </div>
          <button
            onClick={() => setShowMobileCart(false)}
            className="lg:hidden p-1.5 text-dark-400 hover:text-white bg-dark-800 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* LISTA DE PRODUCTOS DEL CARRITO */}
        <div className="flex-1 min-h-[120px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dark-600 opacity-40">
              <Smartphone size={40} className="mb-2" />
              <p className="text-xs font-medium">Carrito Vacío</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.product_id}
                className="bg-dark-800/40 rounded-xl p-3 border border-dark-700/40"
              >
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold flex-1 pr-2 line-clamp-1">
                    {item.name}
                  </span>
                  <button
                    onClick={() => cart.removeItem(item.product_id)}
                    className="text-dark-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 bg-dark-950/60 rounded-lg p-1 border border-dark-700">
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.product_id, item.quantity - 1)
                      }
                      className="p-0.5 hover:text-brand-400 text-dark-400"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-mono font-bold px-1">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.product_id, item.quantity + 1)
                      }
                      className="p-0.5 hover:text-brand-400 text-dark-400"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    {tipoVenta === "personalizado" ? (
                      <div className="flex items-center gap-1 bg-dark-950 px-2 py-0.5 rounded border border-brand-500/30">
                        <span className="text-[9px] text-dark-500 font-mono">
                          S/
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.price}
                          className="w-12 bg-transparent text-right text-xs font-bold text-brand-400 outline-none font-mono"
                          onChange={(e) => {
                            const precioDigitado =
                              parseFloat(e.target.value) || 0;
                            cart.updateItemPrice(
                              item.product_id,
                              precioDigitado,
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-[9px] text-dark-400 font-mono">
                        {item.quantity} x {formatCurrency(item.price)}
                      </span>
                    )}
                    <span className="font-bold text-xs text-brand-400 font-mono">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CONTENEDOR DE CONTROLES DE PAGO Y TRANSACCIÓN (DESPLEGABLES/OPCIONES) */}
        {cart.items.length > 0 && (
          <div className="shrink-0 border-t border-dark-800 bg-dark-900/90 p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* TIPO DE TRANSACCIÓN */}
            <div className="space-y-1">
              <label className="text-[9px] text-dark-400 font-bold uppercase tracking-wider">
                Tipo de Transacción
              </label>
              <div className="grid grid-cols-4 gap-1 bg-dark-950 p-1 rounded-xl border border-dark-800">
                {[
                  { id: "venta", label: "Venta", icon: ShoppingBag },
                  { id: "cotizacion", label: "Cotiz.", icon: FileText },
                  { id: "devolucion", label: "Devol.", icon: RefreshCw },
                  { id: "reserva", label: "Reserv.", icon: Calendar },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoTransaccion(t.id as any)}
                    className={clsx(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all text-center gap-0.5",
                      tipoTransaccion === t.id
                        ? "bg-brand-600 text-white font-bold shadow"
                        : "text-dark-400 hover:text-white",
                    )}
                  >
                    <t.icon size={13} />
                    <span className="text-[9px] tracking-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TIPO DE VENTA */}
            <div className="space-y-1">
              <label className="text-[9px] text-dark-400 font-bold uppercase tracking-wider">
                Tipo de Venta
              </label>
              <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800 w-full">
                {[
                  { id: "menor", label: "Por Menor" },
                  { id: "mayorista", label: "Por Mayor" },
                  { id: "personalizado", label: "Personalizado" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setTipoVenta(v.id as PriceMode);
                      cart.setGlobalPriceMode(v.id as PriceMode);
                    }}
                    className={clsx(
                      "flex-1 text-center py-1 rounded-lg text-xs transition-all flex items-center justify-center gap-1",
                      tipoVenta === v.id
                        ? "bg-dark-800 text-brand-400 font-bold border border-dark-700/60"
                        : "text-dark-400 hover:text-white",
                    )}
                  >
                    <Tag size={11} />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CLIENTE */}
            <div className="space-y-1">
              <label className="text-[9px] text-dark-400 font-bold uppercase tracking-wider">
                Cliente
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-500 text-white font-medium"
              />
            </div>

            {/* MÉTODOS DE PAGO */}
            <div className="space-y-1">
              <label className="text-[9px] text-dark-400 font-bold uppercase tracking-wider">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "efectivo", icon: Banknote, label: "Efectivo" },
                  { id: "tarjeta", icon: CreditCard, label: "Tarjeta (+5%)" },
                  { id: "yape_plin", icon: Smartphone, label: "Yape / Plin" },
                  { id: "transferencia", icon: Layers, label: "Transf." },
                  { id: "mixto", icon: Calculator, label: "Mixto" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id as any)}
                    className={clsx(
                      "p-1.5 rounded-xl border flex flex-col items-center gap-0.5 transition-all",
                      metodoPago === m.id
                        ? "border-brand-500 bg-brand-500/10 text-brand-400 font-bold"
                        : "border-dark-700 text-dark-500 hover:bg-dark-950",
                    )}
                  >
                    <m.icon size={14} />
                    <span className="text-[8px] uppercase tracking-wider">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* TOTALES Y BOTÓN DE VENTA */}
            <div className="space-y-2 border-t border-dark-800 pt-3">
              <div className="flex justify-between text-xs text-dark-400">
                <span>Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(cart.getSubtotal())}
                </span>
              </div>

              {(metodoPago === "tarjeta" || metodoPago === "mixto") && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Comisión Tarjeta (5%)</span>
                  <span className="font-mono">
                    {formatCurrency(cart.getCommisionCard())}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-lg font-black pt-1">
                <span>Total</span>
                <span className="text-brand-500 font-mono">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>

              <button
                onClick={handleConfirmSale}
                disabled={cart.items.length === 0}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-600/30 text-sm"
              >
                <CheckCircle2 size={18} />
                <span>
                  {tipoTransaccion === "venta" && "Finalizar Venta"}
                  {tipoTransaccion === "cotizacion" && "Generar Cotización"}
                  {tipoTransaccion === "devolucion" && "Procesar Devolución"}
                  {tipoTransaccion === "reserva" && "Registrar Reserva"}
                </span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}