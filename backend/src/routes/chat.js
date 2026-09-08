import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { chatWithEngine } from "../luziaEngine.js";

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
  await supabaseAdmin.from("messages").insert({ conversation_id: conversationId, role, content });
  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

chatRouter.post("/", async (req, res) => {
  try {
    const { sessionId, messages, userMessage, userContext } = req.body || {};
    if (!sessionId || !userMessage) {
      return res.status(400).json({ error: "Falta sessionId o userMessage." });
    }

    const conversationId = await getOrCreateConversation(sessionId);
    await saveMessage(conversationId, "user", userMessage);

    const recentHistory = Array.isArray(messages)
      ? messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
      : [];

    const result = await chatWithEngine({
      message: userMessage,
      messages: recentHistory,
      userContext: userContext || {},
    });

    await saveMessage(conversationId, "assistant", result.content);

    res.json({
      content: result.content,
      redirect: result.redirect,
      showOptions: result.showOptions,
      engine: result.engine,
      engineVersion: result.engineVersion,
      knowledgeUsed: result.knowledgeUsed,
      calculationUsed: result.calculationUsed,
      comparisonUsed: result.comparisonUsed,
      recommendationUsed: result.recommendationUsed,
      sources: result.sources,
    });
  } catch (err) {
    console.error("[LuzIA chat]", err);
    res.status(500).json({ error: err.message || "Error interno." });
  }
});
