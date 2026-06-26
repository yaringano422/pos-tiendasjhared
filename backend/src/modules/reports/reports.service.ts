// C:\Puntodeventa\backend\src\modules\reports\reports.service.ts
import { supabase } from "../../config/database";

export class ReportsService {
  //KPIs dinámicos y reales para las tarjetas del Dashboard
  async getDashboardKPIs() {
    // 1. Configurar rango de fechas para HOY en hora local (Perú UTC-5)
    const ahora = new Date();
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
      0,
      0,
      0,
      0,
    ).toISOString();
    const finHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
      23,
      59,
      59,
      999,
    ).toISOString();

    // 2. Consultar las ventas completadas del día de hoy
    const { data: salesToday, error: sError } = await supabase
      .from("sales")
      .select(
        `
        id, 
        total_price, 
        status, 
        date,
        customers (name),
        sales_items (quantity)
      `,
      )
      .gte("date", inicioHoy)
      .lte("date", finHoy)
      .eq("status", "completada");

    if (sError) throw sError;

    // 3. Procesar Ventas del Día (Monto real acumulado)
    const totalSalesToday =
      salesToday?.reduce((acc, sale) => acc + (sale.total_price || 0), 0) || 0;

    // 4. Procesar Unidades de Productos Vendidos
    const totalProductsSold =
      salesToday?.reduce((acc, sale) => {
        const itemsCount = Array.isArray(sale.sales_items)
          ? sale.sales_items.reduce(
              (sum: number, item: any) => sum + (item.quantity || 0),
              0,
            )
          : 0;
        return acc + itemsCount;
      }, 0) || 0;

    // 5. Procesar Clientes Nuevos Únicos (Excluyendo 'PÚBLICO GENERAL')
    const clientesHoy =
      salesToday
        ?.map((sale: any) => {
          // Si Supabase lo devuelve como un array, tomamos el primer elemento; si es objeto, directo.
          const customerObj = Array.isArray(sale.customers)
            ? sale.customers[0]
            : sale.customers;
          return customerObj?.name?.trim().toUpperCase();
        })
        .filter((name) => name && name !== "PÚBLICO GENERAL") || [];

    const totalNewCustomers = new Set(clientesHoy).size;

    // 6. Consultar Alertas de Stock Bajo
    const { count: lowStockCount } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .lt("stock_actual", 5)
      .eq("is_active", true);

    // 7. Inventario Total en unidades físicas reales
    const { data: productsInventory } = await supabase
      .from("products")
      .select("stock_actual")
      .eq("is_active", true);

    const totalInventoryUnits =
      productsInventory?.reduce((sum, p) => sum + (p.stock_actual || 0), 0) ||
      0;

    return {
      salesToday: Number(totalSalesToday.toFixed(2)),
      productsSold: totalProductsSold,
      newCustomers: totalNewCustomers,
      totalInventory: totalInventoryUnits,
      lowStock: lowStockCount || 0,
      timestamp: new Date().toISOString(),
    };
  }

  //Utilidad Real (Venta - Costo de Compra)
  async getRealProfit(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("sales_items")
      .select(
        `
        subtotal,
        products (cost_buy)
      `,
      )
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (error) throw error;

    const profit = data.reduce((sum, item: any) => {
      const cost = item.products.cost_buy || 0;
      return sum + (item.subtotal - cost);
    }, 0);

    return { profit };
  }

  //Top Productos más vendidos
  async getTopProducts(limit = 5) {
    const { data, error } = await supabase
      .from("sales_items")
      .select("quantity, products(name)")
      .order("quantity", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
