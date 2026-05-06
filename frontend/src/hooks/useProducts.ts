import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import type { Product } from "../types";

interface UICategory {
  id: string;
  name: string;
  color: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<UICategory[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Persistente entre renders (clave)
  const colorMapRef = useRef<Record<string, string>>({});

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const getColor = (name: string, index: number) => {
    if (!colorMapRef.current[name]) {
      colorMapRef.current[name] = COLORS[index % COLORS.length];
    }
    return colorMapRef.current[name];
  };

  // ✅ Procesamiento limpio
  const processProducts = useCallback((data: Product[]) => {
    setProducts(data);

    const uniqueCategoryNames = Array.from(
      new Set(data.map((p) => p.category).filter(Boolean)),
    ) as string[];

    const dynamicCategories: UICategory[] = uniqueCategoryNames.map(
      (name, index) => ({
        id: name,
        name,
        color: getColor(name, index),
      }),
    );

    setCategories(dynamicCategories);
  }, []);

  // ✅ Fetch robusto con AbortController correcto
  const fetchProducts = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);

      const API_URL = import.meta.env.VITE_API_URL || "";
      const token = localStorage.getItem("token");

      try {
        // 🔹 Intento Backend
        const response = await fetch(`${API_URL}/products`, {
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Backend error");

        const data = await response.json();

        if (!signal?.aborted) {
          processProducts(data);
        }
      } catch (error: any) {
        // ❗ Ignorar abort
        if (error.name === "AbortError") return;

        console.warn("⚠️ Backend falló, usando Supabase...");

        try {
          const { data, error: sbError } = await supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .order("name");

          if (sbError) throw sbError;

          if (data && !signal?.aborted) {
            processProducts(data as Product[]);
          }
        } catch (finalError) {
          console.error("❌ Error crítico:", finalError);
          toast.error("No se pudieron cargar los productos");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [processProducts],
  );

  // ✅ useEffect con cancelación REAL
  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal);

    return () => {
      controller.abort(); // 🔥 evita memory leaks
    };
  }, [fetchProducts]);

  return {
    products,
    categories,
    loading,
    refetch: fetchProducts,
  };
}
