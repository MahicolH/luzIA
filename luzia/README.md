# LuzIA — proyecto real (frontend + backend)

Esta es la versión de LuzIA convertida en un proyecto de verdad, con:

- **frontend/** — la app que ven tus clientes (el chat) y el panel del admin. React + Vite.
- **backend/** — el servidor que protege tu clave de Groq, guarda las conversaciones y facturas en Supabase, y controla quién puede entrar al panel de admin. Node + Express.
- **supabase/schema.sql** — el script que crea las tablas en tu base de datos.

Antes solo tenías un archivo `.html` suelto. Ahora tienes esto, que sí soporta:
- Login de un único admin, que ve **todas** las conversaciones de **todos** los visitantes.
- Todas las facturas adjuntadas, con su análisis y un link para verlas/descargarlas.
- La clave de Groq ya no está expuesta en el navegador — vive solo en el servidor.

---

## 1. Crea tu proyecto de Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (gratis, sin tarjeta).
2. Crea un proyecto nuevo (elige la región más cercana a España).
3. Cuando esté listo, ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public** key
   - **service_role** key (⚠️ esta es secreta, nunca la pongas en el frontend)
4. Ve a **SQL Editor**, pega todo el contenido de `supabase/schema.sql` y dale **Run**. Esto crea las tablas (`conversations`, `messages`, `invoices`) y el bucket de almacenamiento para las facturas.
5. Ve a **Authentication → Users → Add user → Create new user** y crea tu único usuario admin (correo + contraseña).

## 2. Configura el backend

```bash
cd backend
cp .env.example .env
```

Abre `.env` y completa:
- `GROQ_API_KEY` → tu clave de Groq (console.groq.com/keys)
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` → del paso 1
- `ADMIN_EMAIL` → el correo exacto que usaste para crear el usuario admin
- `FRONTEND_ORIGIN` → por ahora déjalo en `http://localhost:5173`

Instala y arranca:
```bash
npm install
npm run dev
```
Debería decir `LuzIA backend escuchando en http://localhost:8787`.

## 3. Configura el frontend

```bash
cd frontend
cp .env.example .env
```

Abre `.env` y completa:
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → del paso 1 (la "anon public", no la service_role)
- `VITE_API_BASE_URL` → `http://localhost:8787` (o la URL de tu backend cuando lo despliegues)

Instala y arranca:
```bash
npm install
npm run dev
```
Abre `http://localhost:5173` → ahí está el chat de LuzIA.
Abre `http://localhost:5173/admin` → te pide login; entra con el correo/contraseña que creaste en Supabase.

---

## 4. Ponerlo en línea (para que tus clientes lo usen de verdad)

Necesitas desplegar **dos cosas por separado**:

### Backend → Render (gratis para empezar)
1. Sube esta carpeta a un repositorio de GitHub.
2. Entra a [render.com](https://render.com) → New → Web Service → conecta tu repo.
3. Root directory: `backend`. Build command: `npm install`. Start command: `npm start`.
4. En "Environment", agrega las mismas variables que pusiste en tu `.env` local (incluida `FRONTEND_ORIGIN`, que después de desplegar el frontend actualizarás con su URL real).
5. Cuando termine, Render te da una URL tipo `https://luzia-backend.onrender.com`.

### Frontend → Vercel o Netlify (gratis)
1. En [vercel.com](https://vercel.com) → New Project → conecta el mismo repo.
2. Root directory: `frontend`. Vercel detecta Vite automáticamente.
3. Agrega las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` con la URL de Render del paso anterior).
4. Deploy. Te da una URL tipo `https://luzia.vercel.app`.
5. Vuelve a Render y actualiza `FRONTEND_ORIGIN` con esa URL de Vercel (para que el backend acepte peticiones desde ahí).

Con eso, `https://luzia.vercel.app` es el link que le compartes a tus clientes, y `https://luzia.vercel.app/admin` es tu panel privado.

---

## Notas

- El modelo de visión de Groq (`qwen/qwen3.6-27b`) está marcado como "preview" — puede cambiar. Si un día falla, revisa [console.groq.com/docs/models](https://console.groq.com/docs/models) y actualiza `GROQ_VISION_MODEL` en el `.env` del backend.
- Los precios de las tarifas viven en `backend/src/knowledge/pricing.js` — cuando cambien, edita ese archivo y vuelve a desplegar el backend.
- El sidebar del chat quedó simplificado (Inicio + Soporte); Historial/Contratos/Facturación del prototipo anterior no se migraron todavía a este proyecto — puedo agregarlas cuando quieras.
