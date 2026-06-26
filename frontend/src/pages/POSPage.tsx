import React, { useEffect, useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import type { Product, PriceMode } from "../types";

export default function POSPage() {
  // 1. Datos y Hook de productos
  const { products, categories, loading, refetch } = useProducts();
  // 1.1 Estado para controlar la altura del contenedor inferior (en píxeles)
  const [footerHeight, setFooterHeight] = React.useState(520);
  const isResizing = React.useRef(false);

  // 2. Estados de UI
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [customerName, setCustomerName] = useState("Público General");
  // 2.1 Manejador para computadoras (Mouse)
  const startResizing = React.useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault();
      isResizing.current = true;

      const startY = mouseDownEvent.clientY;
      const startHeight = footerHeight;

      const doDrag = (mouseMoveEvent: MouseEvent) => {
        if (!isResizing.current) return;

        // Al arrastrar hacia arriba (delta negativo), la altura del footer aumenta
        const deltaY = mouseMoveEvent.clientY - startY;
        const newHeight = startHeight - deltaY;

        // límites mínimos y máximos para no romper la interfaz
        if (newHeight > 200 && newHeight < window.innerHeight - 150) {
          setFooterHeight(newHeight);
        }
      };

      const stopDrag = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
      };

      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    },
    [footerHeight],
  );

  //  ESTADOS COMPLEMENTARIOS
  const [tipoTransaccion, setTipoTransaccion] = useState<
    "venta" | "cotizacion" | "devolucion" | "reserva"
  >("venta");
  const [tipoVenta, setTipoVenta] = useState<PriceMode>("menor");

  // 3. Estados de Pago
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "mixto" | "yape_plin" | "transferencia"
  >("efectivo");
  const [pagoEfectivo, setPagoEfectivo] = useState(0);
  const [pagoTarjeta, setPagoTarjeta] = useState(0);
  const [comisionTransferencia, setComisionTransferencia] = useState<number>(0);

  const cart = useCartStore();
  const total = cart.getTotal();
  // 3.1 Manejador para móviles (Touch)
  const startResizingTouch = React.useCallback(
    (touchEvent: React.TouchEvent) => {
      isResizing.current = true;
      const startY = touchEvent.touches[0].clientY;
      const startHeight = footerHeight;

      const doDragTouch = (moveEvent: TouchEvent) => {
        if (!isResizing.current) return;
        const deltaY = moveEvent.touches[0].clientY - startY;
        const newHeight = startHeight - deltaY;

        if (newHeight > 200 && newHeight < window.innerHeight - 150) {
          setFooterHeight(newHeight);
        }
      };

      const stopDragTouch = () => {
        isResizing.current = false;
        document.removeEventListener("touchmove", doDragTouch);
        document.removeEventListener("touchend", stopDragTouch);
      };

      document.addEventListener("touchmove", doDragTouch);
      document.addEventListener("touchend", stopDragTouch);
    },
    [footerHeight],
  );

  // 4. Lógica de Escáner (Barcode/QR)
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

  // 5. Sincronización automática de montos
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
      setPagoEfectivo(0);
      setPagoTarjeta(totalConComision);
    } else if (metodoPago === "mixto") {
      setPagoEfectivo(Number((totalConComision / 2).toFixed(2)));
      setPagoTarjeta(Number((totalConComision / 2).toFixed(2)));
    }
  }, [metodoPago, total, comisionTransferencia]);

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

    const precioNormal = Number(product.price);
    const precioMayor = Number(product.price_major || product.price);

    // Asignar precio inicial dinámicamente según la modalidad seleccionada en el footer
    const precioAplicado =
      tipoVenta === "mayorista" ? precioMayor : precioNormal;

    cart.addItem({
      product_id: product.id,
      name: product.name,
      price: precioAplicado,
      price_normal: precioNormal, // <- RESPALDO PRECIO MENOR
      price_major: precioMayor, // <- RESPALDO PRECIO MAYOR
      quantity: 1,
      modo_precio: tipoVenta,
      stock_disponible: isService ? 999 : product.stock_actual,
    } as any);

    toast.success(`${product.name} añadido`, {
      position: "bottom-center",
      duration: 800,
    });
  };

  // 7. Lógica de Impresión
  const printTicket = (saleData: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

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
            <span class="bold" style="font-size: 14px;">TIENDAS JHARED</span><br/>
            RUC: 10201010913<br/>
            Jr.Atahualpa 270 - Huancayo - Junin<br/>
            Tel: 960 097 010
          </div>

          <div class="divider"></div>
          <div>
            FECHA: ${new Date().toLocaleString()}<br/>
            TRANSACCIÓN: ${saleData.tipo_transaccion.toUpperCase()}<br/>
            CLIENTE: ${saleData.customer_name || "PÚBLICO GENERAL"}<br/>
            METODO: ${saleData.metodo_pago.toUpperCase()}<br/>
            TIPO VENTA: ${saleData.items[0]?.modo_precio.toUpperCase() || "MENOR"}
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
                  <td>${item.quantity} x ${item.price.toFixed(2)} (${item.modo_precio})</td>
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

      if (metodoPago === "mixto") {
        const sumaPagos = pagoEfectivo + pagoTarjeta;
        if (Math.abs(sumaPagos - totalFinalVenta) > 0.01) {
          toast.error("La suma de pagos no coincide con el total", {
            id: loadingToast,
          });
          return;
        }
      }

      const subtotalBase = Number((totalFinalVenta / 1.18).toFixed(2));
      const igvCalculado = Number((totalFinalVenta - subtotalBase).toFixed(2));

      const saleData = {
        tipo_transaccion: tipoTransaccion, // <- Mapeado dinámicamente según la selección del usuario
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: Number((item.price * item.quantity).toFixed(2)),
          modo_precio: tipoVenta, // <- Guarda la modalidad seleccionada
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

      const result = await response.json();
      toast.success("Venta completada", { id: loadingToast });

      printTicket({
        ...saleData,
        id: result.id,
      });

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
          "fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex w-full lg:w-[410px] bg-dark-950 lg:bg-dark-900/20 border-l border-dark-800 flex flex-col transition-transform duration-300",
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

        {/* CONTENEDOR DE PRODUCTOS */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
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

                  {/* PRECIO */}
                  <div className="flex flex-col items-end gap-1">
                    {tipoVenta === "personalizado" ? (
                      <div className="flex items-center gap-1 bg-dark-950 px-2 py-0.5 rounded-lg border border-brand-500/30">
                        <span className="text-[10px] text-dark-500 font-mono">
                          S/
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.price}
                          className="w-14 bg-transparent text-right text-xs font-bold text-brand-400 outline-none font-mono"
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
                      <span className="text-[10px] text-dark-400 font-mono">
                        {item.quantity} x {formatCurrency(item.price)}
                      </span>
                    )}

                    <span className="font-bold text-brand-400">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER REAJUSTABLE */}
        {cart.items.length > 0 && (
          <>
            {/* BARRA CONTROLADORA (RESIZER) */}
            <div
              onMouseDown={startResizing}
              onTouchStart={startResizingTouch}
              className="h-3 w-full cursor-ns-resize bg-dark-950 border-t border-b border-dark-800 flex items-center justify-center group select-none transition-colors hover:bg-brand-500/10 active:bg-brand-500/20 z-10"
            >
              <div className="w-12 h-1 bg-dark-700 group-hover:bg-brand-500 rounded-full transition-colors" />
            </div>

            {/* CONTENEDOR INFERIOR AJUSTABLE */}
            <div
              style={{ height: `${footerHeight}px` }}
              className="p-5 bg-dark-900/80 space-y-4 shadow-2xl overflow-y-auto custom-scrollbar flex flex-col justify-between select-none"
            >
              <div>
                {/* 1. SECCIÓN: TIPO DE TRANSACCIÓN */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-dark-400 ml-1 font-bold tracking-wider uppercase">
                    Tipo de Transacción
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-dark-950 p-1 rounded-xl border border-dark-800">
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
                          "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all text-center gap-1",
                          tipoTransaccion === t.id
                            ? "bg-brand-600 text-white shadow font-bold"
                            : "text-dark-400 hover:text-white hover:bg-dark-900/40",
                        )}
                      >
                        <t.icon size={14} />
                        <span className="text-[10px] tracking-tight">
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SECCIÓN: TIPO DE VENTA */}
                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] text-dark-400 ml-1 font-bold tracking-wider uppercase">
                    Tipo de Venta
                  </label>
                  <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800 w-full font-medium">
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
                          cart.setGlobalPriceMode(v.id as PriceMode); // <- SINCRONIZA Y RECALCULA EL STORE AL INSTANTE
                        }}
                        className={clsx(
                          "flex-1 text-center py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5",
                          tipoVenta === v.id
                            ? "bg-dark-800 text-brand-400 border border-dark-700/60 font-bold shadow"
                            : "text-dark-400 hover:text-white",
                        )}
                      >
                        <Tag
                          size={12}
                          className={
                            tipoVenta === v.id
                              ? "text-brand-400"
                              : "text-dark-500"
                          }
                        />
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. CLIENTE */}
                <div className="space-y-1 mt-4">
                  <label className="text-[10px] text-dark-400 ml-1 font-bold uppercase tracking-wider">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm outline-none focus:border-brand-500 text-white font-medium"
                  />
                </div>

                {/* 4. MÉTODOS DE PAGO */}
                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] text-dark-400 ml-1 font-bold uppercase tracking-wider">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "efectivo", icon: Banknote, label: "Efectivo" },
                      {
                        id: "tarjeta",
                        icon: CreditCard,
                        label: "Tarjeta (+5%)",
                      },
                      {
                        id: "yape_plin",
                        icon: Smartphone,
                        label: "Yape / Plin",
                      },
                      { id: "transferencia", icon: Layers, label: "Transf." },
                      { id: "mixto", icon: Calculator, label: "Mixto" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPago(m.id as any)}
                        className={clsx(
                          "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all",
                          metodoPago === m.id
                            ? "border-brand-500 bg-brand-500/10 text-brand-400"
                            : "border-dark-700 text-dark-500 hover:bg-dark-900/50",
                        )}
                      >
                        <m.icon size={16} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {m.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* INPUTS DINÁMICOS DE PAGO */}
                {metodoPago === "mixto" && (
                  <div className="grid grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] text-dark-400 font-bold ml-1">
                        EFECTIVO
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={pagoEfectivo === 0 ? "" : pagoEfectivo}
                        onChange={(e) => {
                          const totalVenta = total + cart.getCommisionCard();
                          const val = Math.max(
                            0,
                            parseFloat(e.target.value) || 0,
                          );
                          if (val > totalVenta) {
                            setPagoEfectivo(totalVenta);
                            setPagoTarjeta(0);
                          } else {
                            setPagoEfectivo(val);
                            setPagoTarjeta(
                              Number((totalVenta - val).toFixed(2)),
                            );
                          }
                        }}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm text-white outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-dark-400 font-bold ml-1">
                        TARJETA (+5%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={pagoTarjeta === 0 ? "" : pagoTarjeta}
                        onChange={(e) => {
                          const totalVenta = total + cart.getCommisionCard();
                          const val = Math.max(
                            0,
                            parseFloat(e.target.value) || 0,
                          );
                          if (val > totalVenta) {
                            setPagoTarjeta(totalVenta);
                            setPagoEfectivo(0);
                          } else {
                            setPagoTarjeta(val);
                            setPagoEfectivo(
                              Number((totalVenta - val).toFixed(2)),
                            );
                          }
                        }}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 text-sm text-white outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {metodoPago === "transferencia" && (
                  <div className="space-y-1 mt-3 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] text-dark-400 font-bold ml-1">
                      COMISIÓN TRANSFERENCIA (%)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={
                          comisionTransferencia === 0
                            ? ""
                            : comisionTransferencia
                        }
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            parseFloat(e.target.value) || 0,
                          );
                          setComisionTransferencia(val);
                        }}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg p-2 pr-8 text-sm text-white outline-none focus:border-brand-500 font-mono"
                      />
                      <span className="absolute right-3 text-sm text-dark-400 font-mono font-bold">
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* TOTALES Y BOTÓN FIJADOS ABAJO */}
              <div className="space-y-3 mt-auto">
                <div className="space-y-2 border-t border-dark-700 pt-3">
                  <div className="flex justify-between text-sm text-dark-400">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      {formatCurrency(cart.getSubtotal())}
                    </span>
                  </div>

                  {(metodoPago === "tarjeta" || metodoPago === "mixto") && (
                    <div className="flex justify-between text-sm text-emerald-400 animate-in fade-in duration-150">
                      <span>Comisión Tarjeta (5%)</span>
                      <span className="font-mono">
                        {formatCurrency(cart.getCommisionCard())}
                      </span>
                    </div>
                  )}

                  {metodoPago === "transferencia" &&
                    comisionTransferencia > 0 && (
                      <div className="flex justify-between text-sm text-emerald-400 animate-in fade-in duration-150">
                        <span>
                          Comisión Transferencia ({comisionTransferencia}%)
                        </span>
                        <span className="font-mono">
                          {formatCurrency(
                            total * (comisionTransferencia / 100),
                          )}
                        </span>
                      </div>
                    )}

                  <div className="flex justify-between text-xl font-black pt-2">
                    <span>Total</span>
                    <span className="text-brand-500 font-mono">
                      {formatCurrency(
                        metodoPago === "tarjeta" || metodoPago === "mixto"
                          ? cart.getTotal() + cart.getCommisionCard()
                          : metodoPago === "transferencia"
                            ? cart.getTotal() +
                              Number(
                                (total * (comisionTransferencia / 100)).toFixed(
                                  2,
                                ),
                              )
                            : cart.getTotal(),
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmSale}
                  disabled={cart.items.length === 0}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-brand-900/20"
                >
                  <CheckCircle2 size={22} />
                  <span>
                    {tipoTransaccion === "venta" && "Finalizar Venta"}
                    {tipoTransaccion === "cotizacion" && "Generar Cotización"}
                    {tipoTransaccion === "devolucion" && "Procesar Devolución"}
                    {tipoTransaccion === "reserva" && "Registrar Reserva"}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
