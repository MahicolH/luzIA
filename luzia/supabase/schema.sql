-- ============================================================
-- LuzIA — esquema de base de datos para Supabase
-- Cómo usarlo: Supabase -> tu proyecto -> SQL Editor -> pega
-- todo este archivo -> Run.
-- ============================================================

-- Conversaciones (una por sesión de chat de un visitante)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mensajes de cada conversación
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Facturas adjuntadas por los clientes
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  conversation_id uuid references conversations(id) on delete set null,
  file_path text not null,       -- ruta dentro del bucket "invoices"
  file_name text not null,
  analysis text,                 -- lo que respondió la IA al analizarla
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_conversations_session on conversations(session_id);
create index if not exists idx_invoices_session on invoices(session_id);

-- Bucket privado de almacenamiento para las facturas.
-- (Si ya existe un bucket "invoices" este insert no hace nada.)
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Seguridad (RLS)
-- El backend habla con Supabase usando la "service role key" (secreta,
-- solo vive en el servidor), que se salta RLS por diseño. El frontend
-- NUNCA toca estas tablas directamente, solo usa Supabase para el login
-- del admin (Auth) y le pide los datos a nuestro propio backend.
-- Por eso dejamos RLS activado sin políticas: bloquea todo acceso
-- directo desde el navegador con la clave anon, y solo el backend
-- (con la service role key) puede leer/escribir.
-- ------------------------------------------------------------
alter table conversations enable row level security;
alter table messages enable row level security;
alter table invoices enable row level security;
