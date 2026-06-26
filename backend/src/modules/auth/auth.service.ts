import { supabase } from "../../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export class AuthService {
  async login(usernameOrEmail: string, password: string) {
    // 1. Intentar buscar el usuario por su 'username'
    let { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", usernameOrEmail)
      .eq("is_active", true) // estado activo
      .maybeSingle();

    // 2. Si no se encontró por username y no hubo error, busca por'email'
    if (!user && !error) {
      const searchByEmail = await supabase
        .from("users")
        .select("*")
        .eq("email", usernameOrEmail)
        .eq("is_active", true)
        .maybeSingle();

      user = searchByEmail.data;
      error = searchByEmail.error;
    }

    // 3. Error de conexión con Supabase
    if (error) {
      console.error("Error crítico en consulta de Supabase:", error);
      throw new Error("Error interno del servidor");
    }

    // 4. Si no existe el usuario
    if (!user) {
      throw new Error("Usuario no encontrado o inactivo");
    }

    // 5. Verificar la contraseña usando el hash de bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Contraseña incorrecta");
    }

    // 6. Generar el Token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      env.jwtSecret,
      { expiresIn: "24h" },
    );

    // 7. Retornar la estructura exacta que espera el frontend (Zustand/authStore)
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      token,
    };
  }
}
