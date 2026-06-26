/**
 * Convierte de forma segura un string de fecha de PostgreSQL/Supabase (UTC)
 * a un objeto Date real de JavaScript, forzando su correcta interpretación UTC.
 */
export const parseUTC = (
  dateString: string | Date | null | undefined,
): Date => {
  if (!dateString) return new Date();
  if (dateString instanceof Date) return dateString;

  // Si ya contiene un indicador de zona horaria (Z o desvíos +-), se parsea directo
  if (dateString.includes("Z") || dateString.includes("+")) {
    return new Date(dateString);
  }

  // Supabase devuelve "YYYY-MM-DD HH:mm:ss.sss".
  // Reemplazamos el espacio por 'T' y concatenamos 'Z' para blindar el parseo en UTC.
  const safeISO = dateString.trim().replace(" ", "T") + "Z";
  return new Date(safeISO);
};
/**
 * Extrae de forma segura la fecha en formato estricto "YYYY-MM-DD"
 * ajustada automáticamente a la zona horaria de Perú (America/Lima).
 */
export const formatToPeruDateString = (dateString: string | Date): string => {
  if (!dateString) return "";
  const date = parseUTC(dateString);

  // 'en-CA' (Canadá) devuelve nativamente el formato YYYY-MM-DD,
  // permitiendo que Intl maneje el desplazamiento horario de Perú a la perfección.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const getLocalDate = (dateString: string | Date) => {
  return parseUTC(dateString);
};
