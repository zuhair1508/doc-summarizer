-- Doc Summarizer schema. All access is server-side via the service role;
-- RLS is enabled with no policies so anon/authenticated keys see nothing.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  kind text not null check (kind in ('pdf', 'text')),
  title text not null,
  content_hash text not null,
  pages jsonb not null,
  page_count int not null,
  storage_path text,
  share_id text unique,
  created_at timestamptz not null default now(),
  -- Per-browser cache: the same content uploaded twice by one browser reuses its summaries.
  unique (client_id, content_hash)
);
create index documents_client_created_idx on public.documents (client_id, created_at desc);
create index documents_created_idx on public.documents (created_at);

create table public.summaries (
  document_id uuid not null references public.documents (id) on delete cascade,
  lens text not null check (lens in ('brief', 'actions', 'eli5', 'critique')),
  content jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  primary key (document_id, lens)
);

create table public.rate_events (
  id bigint generated always as identity primary key,
  ip text not null,
  document_id uuid,
  lens text,
  created_at timestamptz not null default now()
);
create index rate_events_ip_created_idx on public.rate_events (ip, created_at);

alter table public.documents enable row level security;
alter table public.summaries enable row level security;
alter table public.rate_events enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
