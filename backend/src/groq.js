const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq(apiMessages, model) {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      temperature: 0.6,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No obtuve respuesta.";
}

// Detecta las etiquetas [OPCIONES] / [REDIRECT:luz] que la IA agrega
// al final de su respuesta, igual que hacía la versión de un solo archivo.
export function parseRedirect(text) {
  const optionsMatch = text.match(/\[OPCIONES\]/);
  const redirectMatch = text.match(/\[REDIRECT:luz\]/);
  let clean = text;
  if (optionsMatch) clean = clean.replace(optionsMatch[0], "").trim();
  if (redirectMatch) clean = clean.replace(redirectMatch[0], "").trim();
  return {
    clean,
    redirect: redirectMatch ? "luz" : null,
    showOptions: !!optionsMatch,
  };
}
