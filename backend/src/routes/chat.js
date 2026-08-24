import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { callGroq, parseRedirect } from "../groq.js";
import { SYSTEM_PROMPT } from "../knowledge/systemPrompt.js";

export const chatRouter = Router();

async function getOrCreateConversation(sessionId) {
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("conversations")
    .insert({ session_id: sessionId })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}

async function saveMessage(conversationId, role, content) {
  await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
  });
  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

// POST /api/chat
// body: { sessionId: string, messages: [{role, content}], userMessage: string }
chatRouter.post("/", async (req, res) => {
  try {
    const { sessionId, messages, userMessage } = req.body || {};
    if (!sessionId || !userMessage) {
      return res.status(400).json({ error: "Falta sessionId o userMessage." });
    }

    const conversationId = await getOrCreateConversation(sessionId);
    await saveMessage(conversationId, "user", userMessage);

    const recentHistory = Array.isArray(messages) ? messages.slice(-10) : [];
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    ];

    const raw = await callGroq(apiMessages, process.env.GROQ_TEXT_MODEL);
    const { clean, redirect, showOptions } = parseRedirect(raw);

    await saveMessage(conversationId, "assistant", clean);

    res.json({ content: clean, redirect, showOptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error interno." });
  }
});
