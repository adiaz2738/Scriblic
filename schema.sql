-- Run this once against your Neon database (Neon console → SQL editor is the
-- easiest way — paste this whole file in and click run).

create table if not exists boards (
  id text primary key,
  name text not null default 'Untitled board',
  canvas_bg text not null default '#FFFFFF',
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_updated_at_idx on boards (updated_at desc);
