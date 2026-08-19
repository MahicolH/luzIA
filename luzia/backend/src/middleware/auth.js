import { supabaseAdmin } from "../supabaseAdmin.js";

// El frontend hace login contra Supabase Auth y nos manda el token
// resultante en el header Authorization. Aquí lo validamos contra
// Supabase y, además, comprobamos que sea justo el correo del admin
// (definido en ADMIN_EMAIL) — así aunque alguien más se registrara
// en el proyecto de Supabase, no podría entrar al panel.
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Falta el token de sesión." });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const userEmail = (data.user.email || "").toLowerCase().trim();

    if (!adminEmail || userEmail !== adminEmail) {
      return res.status(403).json({ error: "Esta cuenta no tiene permisos de administrador." });
    }

    req.adminUser = data.user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Error verificando la sesión." });
  }
}
