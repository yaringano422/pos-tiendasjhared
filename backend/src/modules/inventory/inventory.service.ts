import { supabase } from "../../config/database";

export interface Product {
  id?: number;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  cost_buy: number;
  price_major: number;
  stock: number;
  stock_actual: number;
  provider_id?: number;
  qr_code?: string;
  barcode?: string;
  is_active: boolean;
}

export class InventoryService {
  // ✅ Obtener productos paginados (Ajustado a 10 items por página como en main_ui)
  async getProductsPaginated(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("products")
      .select("*, providers(name)", { count: "exact" })
      .eq("is_active", true)
      .range(offset, offset + limit - 1)
      .order("id", { ascending: true });

    if (error) throw error;
    return { products: data, total: count };
  }

  // ✅ Agregar o actualizar producto (Lógica de add_product [cite: 24, 25])
  async addProduct(productData: any) {
    const { provider_name, qr_code, barcode, name, brand, category, stock } =
      productData;

    // 1. Buscar o crear proveedor [cite: 25, 26]
    let providerId = null;
    if (provider_name) {
      const { data: provider } = await supabase
        .from("providers")
        .select("id")
        .eq("name", provider_name)
        .single();

      if (!provider) {
        const { data: newProv } = await supabase
          .from("providers")
          .insert([{ name: provider_name }])
          .select()
          .single();
        providerId = newProv?.id;
      } else {
        providerId = provider.id;
      }
    }

    // 2. Buscar producto existente [cite: 27, 28]
    const { data: existingProduct } = await supabase
      .from("products")
      .select("*")
      .match({ name, brand, category })
      .single();

    if (existingProduct) {
      // Actualizar stock [cite: 28, 29]
      const { data, error } = await supabase
        .from("products")
        .update({
          stock: existingProduct.stock + stock,
          stock_actual: existingProduct.stock_actual + stock,
          qr_code: qr_code || existingProduct.qr_code,
          barcode: barcode || existingProduct.barcode,
        })
        .eq("id", existingProduct.id)
        .select();
      if (error) throw error;
      return data;
    } else {
      // Crear nuevo [cite: 30, 31]
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            ...productData,
            provider_id: providerId,
            stock_actual: stock,
            is_active: true,
          },
        ])
        .select();
      if (error) throw error;
      return data;
    }
  }

  // ✅ Obtener todos los productos activos [cite: 34]
  async getAllProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*, providers(name)")
      .eq("is_active", true);
    if (error) throw error;
    return data;
  }

  // ✅ Búsqueda por palabra clave [cite: 35, 36]
  async searchProducts(keyword: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*, providers(name)")
      .or(
        `name.ilike.%${keyword}%,brand.ilike.%${keyword}%,category.ilike.%${keyword}%`,
      )
      .eq("is_active", true);
    if (error) throw error;
    return data;
  }

  // ✅ Actualizar producto [cite: 39, 40]
  async updateProduct(id: number, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select();
    if (error) throw error;
    return data;
  }

  // ✅ Soft Delete [cite: 37, 38]
  async deactivate(id: number) {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
    return data;
  }
}
