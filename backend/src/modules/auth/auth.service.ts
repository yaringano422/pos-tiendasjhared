import { supabase } from "../../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export class AuthService {
  async login(username: string, password: string) {
    // 1. Buscar usuario en Supabase (tabla users)
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (error || !user) throw new Error("Usuario no encontrado");

    // 2. Verificar contraseña (comparando con el hash de bcrypt)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Contraseña incorrecta");

    // 3. Generar JWT para el frontend
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      env.jwtSecret,
      { expiresIn: "24h" },
    );

    return {
      user: { id: user.id, username: user.username, role: user.role },
      token,
    };
  }
}
