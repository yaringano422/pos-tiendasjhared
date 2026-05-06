import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

if (!env.supabaseUrl || !env.supabaseKey) {
  console.error(
    "❌ Error: Faltan variables de entorno de Supabase en el objeto env",
  );
}

export const supabase = createClient(env.supabaseUrl, env.supabaseKey);
