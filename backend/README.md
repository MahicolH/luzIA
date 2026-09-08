# LuzIA Backend conectado a LuzIA Engine

Este backend mantiene la API de LuzIA y el almacenamiento en Supabase, pero sustituye la llamada directa a Groq por llamadas al **LuzIA Engine**.

## Arquitectura

Frontend LuzIA -> Backend LuzIA -> LuzIA Engine -> Knowledge/Calculator/Comparison/Recommendation -> Ollama/Qwen3

## Variables principales

```env
LUZIA_ENGINE_URL=http://localhost:3000
LUZIA_ENGINE_TIMEOUT_MS=0
LUZIA_ENGINE_API_KEY=
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...
PORT=8787
FRONTEND_ORIGIN=http://localhost:5173
```

## Chat

`POST /api/chat`

Body compatible con la versión anterior:

```json
{
  "sessionId": "uuid",
  "messages": [{"role":"user","content":"Hola"}],
  "userMessage": "¿Qué tarifa me conviene?",
  "userContext": {}
}
```

El backend reenvía el mensaje y el historial reciente al `POST /chat` de LuzIA Engine.

## Facturas

`POST /api/invoices` mantiene la subida a Supabase. Los PDF con texto pasan ahora por LuzIA Engine para el análisis.

El análisis de imágenes todavía requiere añadir un módulo de visión al Engine. El backend no vuelve a llamar a Groq.
