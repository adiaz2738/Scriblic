-- Run this once against your Neon database (Neon console → SQL editor is the
-- easiest way — paste this whole file in and click run).

create extension if not exists pgcrypto;

create table if not exists boards (
  id text primary key,
  name text not null default 'Untitled board',
  canvas_bg text not null default '#FFFFFF',
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_updated_at_idx on boards (updated_at desc);

-- Public, unauthenticated share links (see app/share/[token]).
-- share_token is only ever populated when is_public is turned on; toggling
-- is_public back off leaves it revoked (checked in getBoardByShareToken)
-- but keeps the same token if re-enabled, so previously-shared links don't
-- silently change if a user toggles sharing off and on again.
alter table boards add column if not exists share_token text unique;
alter table boards add column if not exists is_public boolean not null default false;
