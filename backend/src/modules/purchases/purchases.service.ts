import { supabase } from '../../config/database';

export interface PurchaseDetail {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface PurchaseRequest {
  provider_id: number;
  document_type: string; // Boleta, Factura, etc.
  document_number: string;
  payment_type: string;
  details: PurchaseDetail[];
}

export class PurchaseService {
  private readonly IGV_RATE = 0.18;

  async registerPurchase(data: PurchaseRequest) {
    // 1. Calcular totales basado en la lógica de purchases.py
    const total = data.details.reduce((sum, d) => sum + (d.quantity * d.unit_price), 0);
    const igv = total * this.IGV_RATE;
    const subtotal = total - igv;

    // 2. Crear cabecera de compra
    const { data: purchase, error: pError } = await supabase
      .from('purchases')
      .insert([{
        provider_id: data.provider_id,
        document_type: data.document_type,
        document_number: data.document_number,
        payment_type: data.payment_type,
        subtotal: subtotal,
        igv: igv,
        total: total,
        date_issue: new Date().toISOString()
      }])
      .select()
      .single();

    if (pError) throw new Error(`Error en cabecera de compra: ${pError.message}`);

    // 3. Procesar detalles y actualizar productos
    for (const item of data.details) {
      const itemSubtotal = item.quantity * item.unit_price;

      // A. Insertar detalle
      const { error: dError } = await supabase
        .from('purchase_details')
        .insert([{
          purchase_id: purchase.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: itemSubtotal
        }]);

      if (dError) throw dError;

      // B. Actualizar Producto (Stock y Precio de Costo)
      const { data: product } = await supabase
        .from('products')
        .select('stock_actual, cost_buy')
        .eq('id', item.product_id)
        .single();

      if (product) {
        await supabase
          .from('products')
          .update({
            stock_actual: (product.stock_actual || 0) + item.quantity,
            cost_buy: item.unit_price // Actualizamos al último precio de compra
          })
          .eq('id', item.product_id);
      }
    }

    return purchase;
  }

  async getPurchasesHistory(month?: number, year?: number) {
    let query = supabase
      .from('purchases')
      .select('*, providers(name)')
      .order('date_issue', { ascending: false });

    // Lógica de filtrado por periodo como en purchases_ui.txt
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0).toISOString();
      query = query.gte('date_issue', startDate).lte('date_issue', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}