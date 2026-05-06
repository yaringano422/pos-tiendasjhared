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
        quantity,
        metodo_pago,
        status,
        products (name, brand),
        customers (name),
        users (username)
      `,
      )
      .order("date", { ascending: false });

    // Aplicar filtros si existen (por fecha, por cliente, etc.)
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
