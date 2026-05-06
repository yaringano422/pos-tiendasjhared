import { supabase } from "../../config/database";
import bcrypt from "bcryptjs";

export class UserService {
  // Combinación de Auth + Admin
  async authenticate(username: string, password: string) {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) return user;

    // Lógica de migración de texto plano a bcrypt (si aplica)
    if (user.password === password) {
      const hashed = await bcrypt.hash(password, 10);
      await supabase
        .from("users")
        .update({ password: hashed })
        .eq("id", user.id);
      return user;
    }
    return null;
  }

  async getAllUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, username, email, role, is_active")
      .order("id", { ascending: true });
    if (error) throw error;
    return data;
  }

  async createUser(userData: any) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          ...userData,
          password: hashedPassword,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: any) {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteUser(id: string) {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}
