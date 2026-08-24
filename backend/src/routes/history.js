import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin.js";

export const historyRouter = Router();

// GET /api/history/:sessionId
// Devuelve únicamente las conversaciones y mensajes de ESE sessionId.
// No requiere login porque los usuarios normales no tienen cuenta — el
// sessionId es un UUID aleatorio guardado en su propio navegador, así
// que en la práctica solo cada visitante conoce el suyo. No es tan
// fuerte como un login real, pero es el mismo nivel de privacidad que
// usan la mayoría de widgets de chat sin cuentas de usuario.
historyRouter.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ error: "Falta sessionId." });

    const { data: conversations, error } = await supabaseAdmin
      .from("conversations")
      .select("id, created_at, updated_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (!conversations.length) return res.json([]);

    const ids = conversations.map((c) => c.id);
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id, role, content, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true });
    if (msgError) throw msgError;

    const byConversation = {};
    for (const m of messages) {
      if (!byConversation[m.conversation_id]) byConversation[m.conversation_id] = [];
      byConversation[m.conversation_id].push(m);
    }

    const result = conversations
      .map((c) => ({ ...c, messages: byConversation[c.id] || [] }))
      .filter((c) => c.messages.length > 0);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error interno." });
  }
});
