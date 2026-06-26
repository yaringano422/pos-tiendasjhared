import { supabase } from "../../config/database";

export class SalesService {
  // 1. REGISTRAR UNA VENTA MULTI-ITEM O INDIVIDUAL
  async registerSale(data: any) {
    const {
      items, // Array de ítems del carrito
      user_id,
      customer_name = "PÚBLICO GENERAL",
      metodo_pago,
      pago_efectivo = 0,
      pago_tarjeta = 0,
      pago_transferencia = 0,
      comision_tarjeta = 0,
      tipo_transaccion = "venta", // Captura el tipo de transacción del POS ('venta', 'cotizacion', etc.)
    } = data;

    if (!items || items.length === 0) {
      throw new Error("El carrito de ventas está vacío");
    }

    const esCotizacion = tipo_transaccion === "cotizacion";
    const esReserva = tipo_transaccion === "reserva";
    const esDevolucion = tipo_transaccion === "devolucion";

    // --- VALIDAR STOCK (Se salta si es una Cotización) ---
    if (!esCotizacion && !esDevolucion) {
      for (const item of items) {
        const { data: p } = await supabase
          .from("products")
          .select("stock_actual, name")
          .eq("id", item.product_id)
          .single();

        if (!p || (p.stock_actual || 0) < item.quantity) {
          throw new Error(
            `Stock insuficiente para el producto: ${p?.name || "ID: " + item.product_id}`,
          );
        }
      }
    }

    // --- GESTIÓN O CREACIÓN DE CLIENTE ---
    let customerId = null;
    const normalizedClient = customer_name.trim().toUpperCase();

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("name", normalizedClient)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer, error: cErr } = await supabase
        .from("customers")
        .insert([{ name: normalizedClient }])
        .select()
        .single();
      if (!cErr) customerId = newCustomer?.id;
    } else {
      customerId = customer.id;
    }

    // --- CALCULAR TOTALES Y DECIMALES EXACTOS ---
    const base_total = items.reduce(
      (acc: number, item: any) =>
        acc + Number((item.price * item.quantity).toFixed(2)),
      0,
    );
    const total_price = Number((base_total + comision_tarjeta).toFixed(2));

    // --- DETERMINAR TIPO DE VENTA (Mapeo basado en el primer ítem) ---
    const primerItemModo = items[0]?.modo_precio || "menor";
    const rootTipoVenta =
      primerItemModo === "mayorista"
        ? "venta_mayorista"
        : primerItemModo === "personalizado"
          ? "venta_personalizada"
          : "venta_menor";

    // --- REGISTRAR LA CABECERA DE LA VENTA ---
    const { data: sale, error: sError } = await supabase
      .from("sales")
      .insert([
        {
          user_id,
          customer_id: customerId,
          total_price,
          metodo_pago: metodo_pago.toLowerCase(),
          pago_efectivo: Number(pago_efectivo.toFixed(2)),
          pago_tarjeta: Number(pago_tarjeta.toFixed(2)),
          comision_tarjeta: Number(comision_tarjeta.toFixed(2)),
          status: esCotizacion
            ? "cotizacion"
            : esReserva
              ? "reserva"
              : esDevolucion
                ? "returned"
                : "completada",
          date: new Date().toISOString(),
          tipo_venta: rootTipoVenta,
        },
      ])
      .select()
      .single();

    if (sError || !sale)
      throw new Error(`Error al guardar cabecera: ${sError?.message}`);

    // --- DETALLES DE VENTA Y MOVIMIENTO DE KARDEX ---
    for (const item of items) {
      // Mapeo dinámico por ítem para tipo_venta
      const itemTipoVenta =
        item.modo_precio === "mayorista"
          ? "venta_mayorista"
          : item.modo_precio === "personalizado"
            ? "venta_personalizada"
            : "venta_menor";

      // Mapeo dinámico para tipo_transaccion respetando la restricción CHECK
      let itemTipoTransaccion = tipo_transaccion;
      if (tipo_transaccion === "venta") {
        itemTipoTransaccion = "venta_con_inv"; // Por defecto, si es venta normal va a inventario
      }

      await supabase.from("sales_items").insert({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: Number((item.price * item.quantity).toFixed(2)),
        tipo_venta: itemTipoVenta,
        tipo_transaccion: itemTipoTransaccion,
      });

      // --- ACTUALIZAR STOCK E HISTÓRICOS (Solo si NO es una Cotización) ---
      if (!esCotizacion) {
        const { data: pStock } = await supabase
          .from("products")
          .select("stock, stock_actual, stock_sold")
          .eq("id", item.product_id)
          .single();

        if (pStock) {
          // Si es una devolución directa desde el POS, se suma stock; si es venta/reserva, se resta.
          const nuevoStockActual = esDevolucion
            ? (pStock.stock_actual || 0) + item.quantity
            : (pStock.stock_actual || 0) - item.quantity;

          const nuevoStockSold = esDevolucion
            ? Math.max(0, (pStock.stock_sold || 0) - item.quantity)
            : (pStock.stock_sold || 0) + item.quantity;

          const stockInicial =
            pStock.stock || nuevoStockActual + nuevoStockSold || 1;
          const nuevoSalePercentage = Number(
            ((nuevoStockSold / stockInicial) * 100).toFixed(2),
          );

          await supabase
            .from("products")
            .update({
              stock_actual: nuevoStockActual,
              stock_sold: nuevoStockSold,
              sale_percentage: nuevoSalePercentage,
            })
            .eq("id", item.product_id);
        }

        // Registro en la tabla de movimientos de inventario
        await supabase.from("inventory_movements").insert({
          product_id: item.product_id,
          type: esDevolucion ? "devolucion" : esReserva ? "reserva" : "sale",
          quantity: item.quantity,
          description: `${tipo_transaccion.toUpperCase()} #${sale.id} POS (Modo: ${item.modo_precio || "normal"})`,
        });
      }
    }

    // --- REGISTRAR MOVIMIENTO EN CAJA CHICA DIARIA (Se salta si es Cotización) ---
    if (!esCotizacion) {
      await supabase.from("cash_movements").insert([
        {
          type: esDevolucion ? "egreso" : "ingreso",
          amount: total_price,
          description: `${tipo_transaccion.toUpperCase()} POS #${sale.id} - Cliente: ${normalizedClient}`,
          method: metodo_pago.toLowerCase(),
          user_id,
        },
      ]);
    }

    return sale;
  }

  // 2. ANULACIÓN COMPLETA DE VENTA
  async cancelSale(saleId: number, reason: string, userId: number) {
    const { data: sale, error: fError } = await supabase
      .from("sales")
      .select("*, sales_items(*)")
      .eq("id", saleId)
      .single();

    if (fError || !sale) throw new Error("Venta no encontrada");
    if (sale.status === "cancelled")
      throw new Error("La venta ya se encuentra anulada");

    const minutosTranscurridos =
      (Date.now() - new Date(sale.date).getTime()) / 60000;
    if (minutosTranscurridos > 15) {
      throw new Error(
        "El tiempo límite de 15 minutos para anular esta venta ha expirado",
      );
    }

    // Reincorporar inventario y RECALCULAR ROTACIÓN EN BASE DE DATOS
    if (sale.sales_items && sale.sales_items.length > 0) {
      for (const item of sale.sales_items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock, stock_actual, stock_sold")
          .eq("id", item.product_id)
          .single();

        if (prod) {
          const nuevoStockActual = (prod.stock_actual || 0) + item.quantity;
          const nuevoStockSold = Math.max(
            0,
            (prod.stock_sold || 0) - item.quantity,
          );

          // Recalcular de forma exacta usando el stock histórico para evitar desajustes
          const stockInicial =
            prod.stock || nuevoStockActual + nuevoStockSold || 1;
          const nuevoSalePercentage = Number(
            ((nuevoStockSold / stockInicial) * 100).toFixed(2),
          );

          await supabase
            .from("products")
            .update({
              stock_actual: nuevoStockActual,
              stock_sold: nuevoStockSold,
              sale_percentage: nuevoSalePercentage, // Se fija el recalculo correcto aquí
            })
            .eq("id", item.product_id);
        }

        // Registrar contra-movimiento de Kardex
        await supabase.from("inventory_movements").insert({
          product_id: item.product_id,
          type: "anulacion",
          quantity: item.quantity,
          description: `Devolución de stock por Anulación de Venta #${sale.id}`,
        });
      }
    }

    // Cambiar estado de la venta
    await supabase
      .from("sales")
      .update({ status: "cancelled" })
      .eq("id", saleId);

    // Registrar Egreso en la caja chica por la devolución de dinero
    await supabase.from("cash_movements").insert({
      type: "egreso",
      amount: sale.total_price,
      description: `ANULACIÓN Venta POS #${sale.id}. Motivo: ${reason}`,
      method: sale.metodo_pago,
      user_id: userId,
    });

    // Registrar en tabla de Auditoría
    await supabase.from("sales_audit").insert({
      sale_id: saleId,
      action: "cancelled",
      reason,
      performed_by: userId,
    });

    return { id: saleId, status: "cancelled" };
  }

  // 3. REGISTRAR DEVOLUCIÓN DE UNA VENTA
  async registerReturn(saleId: number, reason: string, userId: number) {
    const { data: sale, error: fError } = await supabase
      .from("sales")
      .select("*, sales_items(*)")
      .eq("id", saleId)
      .single();

    if (fError || !sale) throw new Error("Venta no encontrada");
    if (sale.status === "cancelled" || sale.status === "returned") {
      throw new Error(
        "No se puede devolver una venta anulada o previamente devuelta",
      );
    }

    // Reincorporar stock y RECALCULAR ROTACIÓN EN BASE DE DATOS
    if (sale.sales_items) {
      for (const item of sale.sales_items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock, stock_actual, stock_sold")
          .eq("id", item.product_id)
          .single();

        if (prod) {
          const nuevoStockActual = (prod.stock_actual || 0) + item.quantity;
          const nuevoStockSold = Math.max(
            0,
            (prod.stock_sold || 0) - item.quantity,
          );

          // Recalculo de forma exacta usando el stock histórico para evitar desajustes
          const stockInicial =
            prod.stock || nuevoStockActual + nuevoStockSold || 1;
          const nuevoSalePercentage = Number(
            ((nuevoStockSold / stockInicial) * 100).toFixed(2),
          );

          await supabase
            .from("products")
            .update({
              stock_actual: nuevoStockActual,
              stock_sold: nuevoStockSold, // se quita las unidades vendidas
              sale_percentage: nuevoSalePercentage, //  recalculo de la rotación exacta
            })
            .eq("id", item.product_id);
        }

        // Registrar contra-movimiento de Kardex por Devolución
        await supabase.from("inventory_movements").insert({
          product_id: item.product_id,
          type: "devolucion",
          quantity: item.quantity,
          description: `Devolución de ítem por reclamo de Venta #${sale.id}`,
        });
      }
    }

    // Actualizar estado a devuelto
    await supabase
      .from("sales")
      .update({ status: "returned" })
      .eq("id", saleId);

    // Registrar Egreso en Caja
    await supabase.from("cash_movements").insert({
      type: "egreso",
      amount: sale.total_price,
      description: `DEVOLUCIÓN Venta POS #${sale.id}. Motivo: ${reason}`,
      method: sale.metodo_pago,
      user_id: userId,
    });

    // Auditoría
    await supabase.from("sales_audit").insert({
      sale_id: saleId,
      action: "returned",
      reason,
      performed_by: userId,
    });

    return { id: saleId, status: "returned" };
  }

  async getAuditLog() {
    const { data, error } = await supabase
      .from("sales_audit")
      .select("*, users(username)")
      .order("performed_at", { ascending: false });
    if (error) throw error;
    return data;
  }
}
