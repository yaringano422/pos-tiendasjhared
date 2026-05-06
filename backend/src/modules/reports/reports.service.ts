import { supabase } from '../../config/database';
import { PostgrestResponse } from '@supabase/supabase-js';

export class ReportsService {
  // ✅ KPIs para las tarjetas del Dashboard (Ventas Hoy, Compras, Utilidad)
  async getDashboardKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 1. Ventas de hoy
    const { data: sales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', todayISO);

    // 2. Compras de hoy
    const { data: purchases } = await supabase
      .from('purchases')
      .select('total')
      .gte('date_issue', todayISO);

    // 3. Stock Bajo (Productos con stock < 5, como en tu UI)
    const { count: lowStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock_actual', 5)
      .eq('is_active', true);

    const totalSales = sales?.reduce((sum, s) => sum + s.total, 0) || 0;
    const totalPurchases = purchases?.reduce((sum, p) => sum + p.total, 0) || 0;

    return {
      salesToday: totalSales,
      purchasesToday: totalPurchases,
      lowStock: lowStockCount || 0,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ Utilidad Real (Venta - Costo de Compra)
  async getRealProfit(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('sales_items')
      .select(`
        subtotal,
        products (cost_buy)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const profit = data.reduce((sum, item: any) => {
      const cost = item.products.cost_buy || 0;
      return sum + (item.subtotal - cost);
    }, 0);

    return { profit };
  }

  // ✅ Top Productos más vendidos
  async getTopProducts(limit = 5) {
    const { data, error } = await supabase
      .from('sales_items')
      .select('quantity, products(name)')
      .order('quantity', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}