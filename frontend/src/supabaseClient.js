import { createClient } from "@supabase/supabase-js";

// Esta clave "anon" está diseñada para ir en el navegador — no es secreta
// como la de Groq o la service_role de Supabase. Solo sirve para el login
// del admin; el resto de datos (conversaciones, facturas) los pide el
// frontend a nuestro propio backend, no directo a Supabase.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
