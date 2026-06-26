import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      console.log("BODY RECIBIDO EN EL BACKEND:", req.body);

      const { username, password } = req.body;

      // Se valida que los datos no lleguen vacíos antes de ir a Supabase
      if (!username || !password) {
        return res.status(400).json({
          error: "Faltan usuario o contraseña",
          message: "Faltan usuario o contraseña",
        });
      }

      const result = await authService.login(username, password);

      // 'return' para asegurar que la ejecución termine aquí tras responder con éxito
      return res.json(result);
    } catch (error: any) {
      console.error("ERROR CAPTURADO EN EL CONTROLADOR:", error.message);

      // Si ya se envió una respuesta por error, se evita duplicarla
      if (res.headersSent) {
        return;
      }

      // Enviamos el error formateado para Axios
      return res.status(401).json({
        error: error.message,
        message: error.message,
      });
    }
  }
}
