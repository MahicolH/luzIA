const DEFAULT_TIMEOUT_MS = 60_000;

function getConfig() {
  const baseUrl = (
    process.env.LUZIA_ENGINE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const timeoutMs = Number(
    process.env.LUZIA_ENGINE_TIMEOUT_MS ??
    DEFAULT_TIMEOUT_MS
  );

  return {
    baseUrl,
    timeoutMs
  };
}

async function postJson(path, payload) {
  const { baseUrl, timeoutMs } = getConfig();

  const engineKey =
    process.env.LUZIA_ENGINE_API_KEY?.trim();

  const controller = new AbortController();

  const timer =
    timeoutMs > 0
      ? setTimeout(
          () => controller.abort(),
          timeoutMs
        )
      : null;

  try {
    const response = await fetch(
      `${baseUrl}${path}`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          ...(engineKey
            ? {
                'X-Engine-Key': engineKey
              }
            : {})
        },

        body: JSON.stringify(payload),

        signal:
          timeoutMs > 0
            ? controller.signal
            : undefined
      }
    );

    const text = await response.text();

    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = {
        raw: text
      };
    }

    if (!response.ok) {
      console.error(
        '[LuzIA → Engine] Error:',
        JSON.stringify({
          path,
          status: response.status,
          statusText: response.statusText,
          body
        })
      );

      throw new Error(
        body?.error ||
        body?.message ||
        body?.raw ||
        `LuzIA Engine HTTP ${response.status}`
      );
    }

    return body;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `Tiempo de espera agotado al contactar LuzIA Engine después de ${timeoutMs} ms.`
      );
    }

    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function chatWithEngine({
  message,
  messages = [],
  userContext = {}
}) {
  if (!message || typeof message !== 'string') {
    throw new Error(
      'La consulta para LuzIA Engine está vacía o no es válida.'
    );
  }

  const body = await postJson(
    '/chat',
    {
      message,
      messages,
      userContext
    }
  );

  const data = body?.data || {};

  return {
    content:
      data.answer ||
      body?.answer ||
      'No obtuve respuesta.',

    redirect:
      data.redirect ??
      body?.redirect ??
      null,

    showOptions:
      Boolean(
        data.showOptions ??
        body?.showOptions
      ),

    engine:
      body?.engine ||
      'LuzIA Engine',

    engineVersion:
      body?.version ||
      null,

    knowledgeUsed:
      Boolean(
        body?.knowledgeUsed
      ),

    calculationUsed:
      Boolean(
        body?.calculationUsed
      ),

    comparisonUsed:
      Boolean(
        body?.comparisonUsed
      ),

    recommendationUsed:
      Boolean(
        body?.recommendationUsed
      ),

    sources:
      Array.isArray(body?.sources)
        ? body.sources
        : []
  };
}

export async function analyzeInvoiceTextWithEngine({
  pdfText,
  userContext = {}
}) {
  if (!pdfText || typeof pdfText !== 'string') {
    throw new Error(
      'No se recibió texto válido de la factura.'
    );
  }

  const prompt = `
Analiza esta factura de electricidad como LuzIA.

Identifica, solo si aparecen en el texto:
- comercializadora actual
- tarifa
- CUPS
- potencia contratada
- consumo
- periodo facturado
- importe total

Distingue claramente entre datos observados y estimaciones.

Después indica si hay información suficiente para una comparación orientativa con las tarifas disponibles en tu base de conocimiento.

No inventes ningún dato.

TEXTO DE LA FACTURA:

${pdfText}
`.trim();

  return chatWithEngine({
    message: prompt,
    messages: [],
    userContext
  });
}
