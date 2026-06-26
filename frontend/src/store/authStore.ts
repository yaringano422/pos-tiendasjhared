import { create } from "zustand";
import type { User } from "../types";
import { authApi } from "../services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // email por username para que coincida con el backend
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    try {
      set({ isLoading: true });

      // 1. Obtencion la respuesta  del api de autenticación
      const res = await authApi.login({
        username,
        password,
      });

      console.log("Respuesta login raw:", res); // verificar en la consola

      // 2. Extraccion segura sin importar cómo venga estructurado por Axios
      // Si viene directo en 'res' o si viene dentro de una propiedad '.data'
      const token = res?.token || (res as any)?.data?.token;
      const user = res?.user || (res as any)?.data?.user;

      if (!token || !user) {
        throw new Error("El servidor no retornó un token o usuario válido.");
      }

      // 3. Almacenamiento
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      console.error("LOGIN ERROR DETECTADO:", err);
      set({ isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  logout: () => {
    // Limpieza de datos locales
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: () => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (!token || !userData) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Si hay datos, se restaura la sesión
      set({
        user: JSON.parse(userData),
        token: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      console.error("CHECK AUTH ERROR:", err);
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
