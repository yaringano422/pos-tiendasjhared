import { supabase } from "../../config/database";

export class AuditService {
  // =========================
  // GET AUDIT LOGS
  // =========================
  async getAuditLogs() {
    const { data, error } = await supabase
      .from("sales_audit")
      .select(
        `
        *,
        sales (
          id,
          total_price,
          status,
          metodo_pago
        ),
        users!performed_by (
          username
        )
      `,
      )
      .order("performed_at", { ascending: false });

    if (error) {
      // 🟢 Caso normal: no hay registros
      if (error.code === "PGRST116") {
        return [];
      }

      // 🔴 Error real (no rompemos frontend)
      console.error("Error en getAuditLogs:", error);
      return [];
    }

    return data ?? [];
  }

  // =========================
  // VOID SALE (ANULACIÓN TOTAL)
  // =========================
  async voidSale(saleId: number, reason: string, userId: number) {
    // =========================
    // 1. Obtener la venta
    // =========================
    const { data: sale, error: sError } = await supabase
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .single();

    if (sError || !sale) {
      throw new Error("Venta no encontrada");
    }

    if (sale.status === "anulada") {
      throw new Error("La venta ya está anulada");
    }

    // =========================
    // 2. DEVOLVER STOCK (ESCALABLE)
    // =========================
    const { data: items, error: itemsError } = await supabase
      .from("sales_items")
      .select("product_id, quantity")
      .eq("sale_id", saleId);

    if (itemsError) {
      console.error("Error obteniendo items:", itemsError);
    }

    // 🔁 Caso moderno: múltiples productos
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: product, error: pError } = await supabase
          .from("products")
          .select("stock_actual")
          .eq("id", item.product_id)
          .single();

        if (pError) {
          console.error("Error obteniendo producto:", pError);
          continue;
        }

        if (product) {
          const nuevoStock =
            (Number(product.stock_actual) || 0) + (Number(item.quantity) || 0);

          const { error: updateError } = await supabase
            .from("products")
            .update({ stock_actual: nuevoStock })
            .eq("id", item.product_id);

          if (updateError) {
            console.error("Error actualizando stock:", updateError);
          }
        }
      }
    }
    // 🧠 Fallback: ventas antiguas (sin sales_items)
    else if (sale.product_id && sale.quantity) {
      const { data: product, error: pError } = await supabase
        .from("products")
        .select("stock_actual")
        .eq("id", sale.product_id)
        .single();

      if (pError) {
        console.error("Error obteniendo producto fallback:", pError);
      }

      if (product) {
        const nuevoStock =
          (Number(product.stock_actual) || 0) + (Number(sale.quantity) || 0);

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_actual: nuevoStock })
          .eq("id", sale.product_id);

        if (updateError) {
          console.error("Error actualizando stock fallback:", updateError);
        }
      }
    }

    // =========================
    // 3. CAMBIAR ESTADO DE VENTA
    // =========================
    const { error: statusError } = await supabase
      .from("sales")
      .update({ status: "anulada" })
      .eq("id", saleId);

    if (statusError) {
      throw new Error("No se pudo actualizar el estado de la venta");
    }

    // =========================
    // 4. MOVIMIENTO DE CAJA
    // =========================
    const monto = Number(sale.total_price ?? sale.total ?? 0);

    const { error: cashError } = await supabase.from("cash_movements").insert([
      {
        type: "egreso",
        amount: monto,
        description: `ANULACIÓN VENTA #${saleId}: ${reason}`,
        user_id: userId,
      },
    ]);

    if (cashError) {
      console.error("Error registrando movimiento de caja:", cashError);
    }

    // =========================
    // 5. REGISTRO DE AUDITORÍA
    // =========================
    const { data: log, error: logError } = await supabase
      .from("sales_audit")
      .insert([
        {
          sale_id: saleId,
          performed_by: userId,
          action: "ANULACIÓN TOTAL",
          details: reason,
        },
      ])
      .select();

    if (logError) {
      console.error("Error guardando auditoría:", logError);
    }

    return log ?? [];
  }
}
