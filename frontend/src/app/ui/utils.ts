// C:\Puntodeventa\frontend\src\app\ui\utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Exportación por defecto extra de seguridad para Vite
export default cn;
