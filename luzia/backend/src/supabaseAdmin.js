import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    "[LuzIA] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env — el guardado en base de datos y el login de admin no van a funcionar hasta que los configures."
  );
}

// Este cliente usa la service role key: tiene acceso total y se salta
// las políticas de RLS. SOLO debe vivir aquí, en el backend. Nunca lo
// mandes al frontend.
export const supabaseAdmin = createClient(url || "", serviceKey || "", {
  auth: { persistSession: false },
});
