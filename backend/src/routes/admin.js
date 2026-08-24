import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// GET /api/admin/conversations
// Lista todas las conversaciones con sus mensajes (todas las sesiones, todos los visitantes)
adminRouter.get("/conversations", async (req, res) => {
  const { data: conversations, error } = await supabaseAdmin
    .from("conversations")
    .select("id, session_id, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const { data: messages, error: msgError } = await supabaseAdmin
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .order("created_at", { ascending: true });
  if (msgError) return res.status(500).json({ error: msgError.message });

  const byConversation = {};
  for (const m of messages) {
    if (!byConversation[m.conversation_id]) byConversation[m.conversation_id] = [];
    byConversation[m.conversation_id].push(m);
  }

  const result = conversations.map((c) => ({
    ...c,
    messages: byConversation[c.id] || [],
  }));

  res.json(result);
});

// GET /api/admin/invoices
// Lista todas las facturas subidas por cualquier visitante, con un link
// temporal para poder verlas/descargarlas.
adminRouter.get("/invoices", async (req, res) => {
  const { data: invoices, error } = await supabaseAdmin
    .from("invoices")
    .select("id, session_id, file_path, file_name, analysis, created_at")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const withUrls = await Promise.all(
    invoices.map(async (inv) => {
      const { data: signed } = await supabaseAdmin.storage
        .from("invoices")
        .createSignedUrl(inv.file_path, 60 * 60); // 1 hora
      return { ...inv, url: signed?.signedUrl || null };
    })
  );

  res.json(withUrls);
});
