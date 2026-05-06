import { create } from "zustand";
import type { User } from "../types";
import { authApi } from "../services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Cambiamos email por username para que coincida con tu backend de TiendasJhared
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
      
      // Llamada a nuestro servicio que usa axios/client.ts
      const { data } = await authApi.login({ username, password });

      const { token, user } = data;

      // Guardamos en localStorage para que el interceptor de client.ts lo use
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      set({ isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  logout: () => {
    // Limpiamos los datos locales
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
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Si existen datos, restauramos la sesión
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