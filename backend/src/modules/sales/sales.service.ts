import { supabase } from "../../config/database";

export class SalesService {
  async registerSale(data: any) {
    const {
      product_id,
      quantity: qty,
      items,
      user_id,
      customer_name,
      metodo_pago,
      pago_efectivo = 0,
      pago_tarjeta = 0,
      comision_tarjeta = 0,
      modo_precio,
      precio_personalizado,
    } = data;

    // =========================
    // 1. NORMALIZAR ITEMS
    // =========================
    let saleItems = items;

    if (!saleItems && product_id) {
      const { data: p, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", product_id)
        .single();

      if (error || !p) throw new Error("Producto no encontrado");

      let finalPrice = p.price;
      if (modo_precio === "mayorista") finalPrice = p.price_major;
      if (modo_precio === "personalizado") finalPrice = precio_personalizado;

      saleItems = [
        {
          product_id,
          quantity: qty,
          price: finalPrice,
          subtotal: finalPrice * qty,
        },
      ];
    }

    if (!saleItems || saleItems.length === 0) {
      throw new Error("No hay items para procesar");
    }

    // =========================
    // 2. VALIDAR STOCK (ANTES)
    // =========================
    for (const item of saleItems) {
      const { data: p } = await supabase
        .from("products")
        .select("stock_actual")
        .eq("id", item.product_id)
        .single();

      if (!p || p.stock_actual < item.quantity) {
        throw new Error(`Stock insuficiente para producto ${item.product_id}`);
      }
    }

    // =========================
    // 3. TOTAL
    // =========================
    const total_price =
      saleItems.reduce(
        (acc: number, item: any) =>
          acc + (item.subtotal || item.price * item.quantity),
        0,
      ) + (comision_tarjeta || 0);

    // =========================
    // 4. CLIENTE
    // =========================
    let customerId = null;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("name", customer_name || "Público General")
      .single();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert([{ name: customer_name || "Público General" }])
        .select()
        .single();

      customerId = newCustomer?.id;
    } else {
      customerId = customer.id;
    }

    // =========================
    // 5. CREAR VENTA
    // =========================
    const { data: sale, error: sError } = await supabase
      .from("sales")
      .insert([
        {
          user_id,
          customer_id: customerId,
          total_price,
          metodo_pago,
          pago_efectivo,
          pago_tarjeta,
          comision_tarjeta,
          status: "completada",
          date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (sError || !sale) throw sError;

    // =========================
    // 6. ITEMS + STOCK + HISTORIAL
    // =========================
    for (const item of saleItems) {
      await supabase.from("sale_items").insert({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal || item.price * item.quantity,
      });

      const { data: pStock } = await supabase
        .from("products")
        .select("stock_actual")
        .eq("id", item.product_id)
        .single();

      if (pStock) {
        await supabase
          .from("products")
          .update({
            stock_actual: (pStock.stock_actual || 0) - item.quantity,
          })
          .eq("id", item.product_id);
      }

      await supabase.from("inventory_movements").insert({
        product_id: item.product_id,
        type: "sale",
        quantity: item.quantity,
        description: `Venta #${sale.id}`,
      });
    }

    // =========================
    // 7. CAJA
    // =========================
    await supabase.from("cash_movements").insert([
      {
        type: "ingreso",
        amount: total_price,
        description: `Venta #${sale.id}`,
        method: metodo_pago,
        user_id,
      },
    ]);

    return sale;
  }

  async getAuditLog() {
    const { data, error } = await supabase
      .from("sales_audit")
      .select("*, sales(id), users(username)")
      .order("performed_at", { ascending: false });
    if (error) throw error;
    return data;
  }
}
