import { supabase } from "../../config/database";

export class SalesHistoryService {
  async getFullHistory(filters: any = {}) {
    let query = supabase
      .from("sales")
      .select(
        `
        id,
        date,
        total_price,
        metodo_pago,
        status,
        pago_efectivo,
        pago_tarjeta,
        comision_tarjeta,
        customers (name),
        users (username),
        sales_items (
          quantity,
          price,
          subtotal,
          products (name, brand)
        )
      `,
      )
      .order("date", { ascending: false }); // Cronológico inverso estricto

    // Filtros dinámicos pasados desde la URL por query parameters
    if (filters.metodo_pago && filters.metodo_pago !== "Todos") {
      const metodoLower = filters.metodo_pago.toLowerCase();
      // mapeo de Yape/Plin con la Base de Datos
      if (metodoLower === "yape" || metodoLower === "plin") {
        query = query.eq("metodo_pago", "yape_plin");
      } else {
        query = query.eq("metodo_pago", metodoLower);
      }
    }

    if (filters.status && filters.status !== "Todos") {
      query = query.eq("status", filters.status.toLowerCase());
    }

    if (filters.date && filters.date !== "Todos") {
      //'Z' por '-05:00' para sincronizar con la hora de Perú
      query = query
        .gte("date", `${filters.date}T00:00:00.000-05:00`)
        .lte("date", `${filters.date}T23:59:59.999-05:00`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
