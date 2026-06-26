import { supabase } from "../../config/database";

export interface Product {
  id?: number;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  cost_buy: number;
  price_major?: number;
  sale_percentage?: number;
  stock?: number;
  stock_actual: number;
  stock_sold?: number;
  provider_id?: number | null;
  provider_name?: string | null; // Captura el texto desde el formulario
  qr_code?: string | null;
  barcode?: string | null;
  is_active?: boolean;
  date_added?: string;
  user_id?: string | null;
}

export class InventoryService {
  // Método para buscar o crear el proveedor de forma insensible a mayúsculas
  private async getOrCreateProvider(
    providerName: string | undefined | null,
  ): Promise<number | null> {
    if (!providerName || !providerName.trim()) return null;

    const cleanedName = providerName.trim().replace(/\s+/g, " ").toLowerCase();

    // 1. Intentar buscar el proveedor
    const { data: existingProvider, error: searchError } = await supabase
      .from("providers")
      .select("id")
      .ilike("name", cleanedName)
      .maybeSingle();

    if (searchError) {
      console.error(
        "Error al buscar proveedor existente:",
        searchError.message,
      );
    }

    if (existingProvider) {
      return existingProvider.id; // Si es encontrado, se retorna su ID real
    }

    // 2. Si no existe, se crea
    const { data: newProvider, error: insertError } = await supabase
      .from("providers")
      .insert([{ name: cleanedName }])
      .select("id")
      .single();

    if (insertError) {
      throw new Error(
        `Error al crear el proveedor automático: ${insertError.message}`,
      );
    }

    return newProvider ? newProvider.id : null;
  }

  async getProductsPaginated(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from("products")
      .select("*, providers!left(name)", { count: "exact" })
      .eq("is_active", true)
      .range(offset, offset + limit - 1)
      .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    return { data: data || [], total: count || 0, page, limit };
  }

  async getAllProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*, providers!left(name)")
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return data || [];
  }

  async searchProducts(keyword: string) {
    const cleanKeyword = keyword.trim();
    const { data, error } = await supabase
      .from("products")
      .select("*, providers!left(name)")
      .or(
        `name.ilike.%${cleanKeyword}%,brand.ilike.%${cleanKeyword}%,category.ilike.%${cleanKeyword}%,barcode.ilike.%${cleanKeyword}%`,
      )
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return data || [];
  }

  async createProduct(productData: Product) {
    if (!productData.name?.trim()) throw new Error("El nombre es obligatorio");
    if (productData.price <= 0) throw new Error("El precio debe ser mayor a 0");
    if (productData.cost_buy < 0)
      throw new Error("El costo de compra no puede ser negativo");

    if (productData.price < productData.cost_buy)
      throw new Error(
        "El precio de venta no puede ser menor al costo de compra",
      );
    if (productData.stock_actual < 0)
      throw new Error("El stock no puede ser negativo");

    if (productData.barcode) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", productData.barcode)
        .maybeSingle();
      if (existing) throw new Error("El código de barras ya existe");
    }

    // A. Resolver ID de proveedor dinámicamente si se pasó texto
    let finalProviderId = productData.provider_id || null;
    if (productData.provider_name) {
      finalProviderId = await this.getOrCreateProvider(
        productData.provider_name,
      );
    }

    // B. Cálculo automático de rendimiento matemático (sale_percentage)
    const stockTotal = productData.stock || 0;
    const stockVendido = productData.stock_sold || 0;
    const computedPercentage =
      stockTotal > 0 ? Math.round((stockVendido / stockTotal) * 100) : 0;

    const payload = {
      name: productData.name.trim(),
      brand: productData.brand?.trim().toLowerCase() || null,
      category: productData.category?.trim().toLowerCase() || null,
      price: productData.price,
      cost_buy: productData.cost_buy,
      price_major: productData.price_major || 0,
      stock: stockTotal,
      stock_actual: productData.stock_actual || 0,
      stock_sold: stockVendido,
      sale_percentage: computedPercentage,
      provider_id: finalProviderId,
      qr_code: productData.qr_code || null,
      barcode: productData.barcode || null,
      is_active: productData.is_active ?? true,
      user_id: productData.user_id || null,
    };

    const { data, error } = await supabase
      .from("products")
      .insert([{ ...payload }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateProduct(id: number, updates: Partial<Product>) {
    if (updates.price !== undefined && updates.price <= 0)
      throw new Error("El precio debe ser mayor a 0");
    if (updates.cost_buy !== undefined && updates.cost_buy < 0)
      throw new Error("El costo de compra no puede ser negativo");
    if (updates.brand !== undefined) {
      updates.brand = updates.brand.trim().toLowerCase();
    }
    if (updates.category !== undefined) {
      updates.category = updates.category.trim().toLowerCase();
    }

    if (
      updates.price !== undefined &&
      updates.cost_buy !== undefined &&
      updates.price < updates.cost_buy
    )
      throw new Error(
        "El precio de venta no puede ser menor al costo de compra",
      );

    if (updates.barcode) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", updates.barcode)
        .neq("id", id)
        .maybeSingle();
      if (existing)
        throw new Error("El código de barras ya pertenece a otro producto");
    }

    // A. Resolver ID de proveedor dinámicamente si se editó el nombre del proveedor
    if (updates.provider_name !== undefined) {
      updates.provider_id = await this.getOrCreateProvider(
        updates.provider_name,
      );
      // Se elimina  la clave para evitar que intente insertarse directamente en la tabla 'products'
      delete updates.provider_name;
    }

    // B. Recalcular rendimiento si se altera el stock o las unidades vendidas en la edición
    if (updates.stock !== undefined || updates.stock_sold !== undefined) {
      // Obtenemos el registro actual para rellenar los datos faltantes del cálculo
      const { data: currentProduct } = await supabase
        .from("products")
        .select("stock, stock_sold")
        .eq("id", id)
        .single();

      if (currentProduct) {
        const targetStock =
          updates.stock !== undefined ? updates.stock : currentProduct.stock;
        const targetSold =
          updates.stock_sold !== undefined
            ? updates.stock_sold
            : currentProduct.stock_sold;

        updates.sale_percentage =
          targetStock > 0 ? Math.round((targetSold / targetStock) * 100) : 0;
      }
    }

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteProduct(id: number) {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  async getFilters() {
    const { data, error } = await supabase
      .from("products")
      .select("category, brand")
      .eq("is_active", true);

    if (error) throw new Error(error.message);

    // Procesamiento para sacar valores únicos sin repetir
    const categories = [
      ...new Set(data.map((p) => p.category).filter(Boolean)),
    ];
    const brands = [...new Set(data.map((p) => p.brand).filter(Boolean))];

    return {
      categories: categories.sort(),
      brands: brands.sort(),
    };
  }
  async getProviders() {
    // Se usa supabase en lugar de prisma
    const { data, error } = await supabase
      .from("providers")
      .select("id, name") // columnas necesarias
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Error al obtener proveedores: ${error.message}`);
    }

    return data || [];
  }
  async bulkImportProducts(products: Product[]) {
    const results = { success: 0, error: 0, details: [] as any[] };

    for (const p of products) {
      try {
        // 1. Verificar si existe por barcode
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("barcode", p.barcode)
          .maybeSingle();

        if (existing) {
          // Actualizar
          await this.updateProduct(existing.id, p);
          results.success++;
        } else {
          // Crear
          await this.createProduct(p);
          results.success++;
        }
      } catch (err: any) {
        results.error++;
        results.details.push({ product: p.name, error: err.message });
      }
    }
    return results;
  }
}
