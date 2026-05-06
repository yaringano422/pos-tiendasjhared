import { supabase } from '../../config/database';

// Esta interfaz define la forma de tus datos de cliente
export interface Customer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export class CustomerService {
  
  // Obtener todos los clientes
  async getAllCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  // Buscar cliente por nombre
  async getCustomerByName(name: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }

  // Crear o devolver cliente existente (Lógica de tu Python)
  async getOrCreateCustomer(name: string, email?: string, phone?: string): Promise<Customer> {
    const existing = await this.getCustomerByName(name);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, email, phone, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // Actualizar cliente
  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}