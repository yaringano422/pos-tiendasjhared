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

  // Persistente entre renders
  const colorMapRef = useRef<Record<string, string>>({});

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const getColor = (name: string, index: number) => {
    if (!colorMapRef.current[name]) {
      colorMapRef.current[name] = COLORS[index % COLORS.length];
    }
    return colorMapRef.current[name];
  };

  //Procesamiento
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

  //Fetch con AbortController
  const fetchProducts = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);

      const API_URL = import.meta.env.VITE_API_URL || "";
      const token = localStorage.getItem("token");

      try {
        // Intento Backend
        const response = await fetch(`${API_URL}/inventory/`, {
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          //estatus del error (ej. 401, 404, 500)
          console.error(
            `❌ Error del servidor Express. Status: ${response.status}`,
          );
          throw new Error("Backend error");
        }

        const responseData = await response.json();
        console.log(" Datos crudos recibidos del backend:", responseData);

        if (!signal?.aborted) {
          const normalizedData = Array.isArray(responseData)
            ? responseData
            : responseData.data || responseData.products || [];

          processProducts(normalizedData);
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;

        // Se imprime el error exacto que provocó el salto al catch de Supabase
        console.error("🚨 MOTIVO POR EL CUAL FALLÓ EL BACKEND:", error);
        console.warn("⚠️ Backend falló, usando Supabase...");

        try {
          // join relacional para traer el nombre del proveedor
          const { data, error: sbError } = await supabase
            .from("products")
            .select(
              `
        *,
        providers (
          id,
          name
        )
      `,
            )
            .eq("is_active", true)
            .order("name");

          if (sbError) throw sbError;

          if (data && !signal?.aborted) {
            console.log(
              "📡 Datos obtenidos directamente de Supabase Fallback con proveedores:",
              data,
            );
            processProducts(data as unknown as Product[]);
          }
        } catch (finalError) {
          console.error(
            "❌ Error crítico en Fallback de Supabase:",
            finalError,
          );
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

  //useEffect con cancelación
  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal);

    return () => {
      controller.abort(); //no memory leaks
    };
  }, [fetchProducts]);

  return {
    products,
    categories,
    loading,
    refetch: fetchProducts,
  };
}
