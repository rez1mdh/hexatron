// src/services/supabase.ts
// Real Supabase client initialization, authentication handlers, and setup definitions

import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'hexatron-supabase-url';
const STORAGE_KEY_ANON = 'hexatron-supabase-anon-key';

export function getStoredCloudConfig(): { url: string; key: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_ANON) || '';

  return {
    url: (envUrl || localUrl).trim(),
    key: (envKey || localKey).trim(),
  };
}

export function saveCloudConfig(url: string, key: string) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (key) localStorage.setItem(STORAGE_KEY_ANON, key.trim());
  else localStorage.removeItem(STORAGE_KEY_ANON);

  _supabaseInstance = null; // Reset cached client
}

export function isCloudConfigured(): boolean {
  const { url, key } = getStoredCloudConfig();
  return Boolean(url && key && url.startsWith('http'));
}

let _supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseInstance) return _supabaseInstance;
  const { url, key } = getStoredCloudConfig();
  if (!url || !key) return null;

  try {
    _supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return _supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// ── Auth Helpers ───────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    // 1. Fast synchronous/cached session check from localStorage
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      return sessionData.session.user;
    }
    // 2. Network verification fallback
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  } catch (err) {
    console.warn('[getCurrentUser] Error checking user session:', err);
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session ?? null;
}

export async function signUpWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud backend is not configured yet. Please configure your Supabase URL & Anon Key first.');
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud backend is not configured yet. Please configure your Supabase URL & Anon Key first.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud backend is not configured yet.');
  const { data, error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

export function subscribeToAuthState(callback: (user: User | null, session: Session | null) => void) {
  const client = getSupabaseClient();
  if (!client) {
    callback(null, null);
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, session);
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}

// ── Quick Permissions Fix SQL for Owner Article Editing ───────────────────
export const SUPABASE_RLS_QUICK_FIX_SQL = `-- Run this in your Supabase SQL Editor if editing existing articles returns 0 rows affected:
-- Grants write/update permissions on all encyclopedia tables to authenticated project owners
drop policy if exists "Owner update entities" on hex_entities;
create policy "Owner update entities" on hex_entities for update to authenticated using (true) with check (true);
drop policy if exists "Owner insert entities" on hex_entities;
create policy "Owner insert entities" on hex_entities for insert to authenticated with check (true);
drop policy if exists "Owner update relationships" on hex_relationships;
create policy "Owner update relationships" on hex_relationships for update to authenticated using (true) with check (true);
drop policy if exists "Owner insert relationships" on hex_relationships;
create policy "Owner insert relationships" on hex_relationships for insert to authenticated with check (true);
drop policy if exists "Owner update universes" on hex_universes;
create policy "Owner update universes" on hex_universes for update to authenticated using (true) with check (true);
drop policy if exists "Owner update worlds" on hex_worlds;
create policy "Owner update worlds" on hex_worlds for update to authenticated using (true) with check (true);
`;

// ── Setup SQL with RLS for User's Supabase Project ─────────────────────────
export const SUPABASE_SETUP_SQL = `-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Sets up your Hexatron Worldbuilding Encyclopedia database with:
-- 1. Free, public read access for visitors to published lore
-- 2. Strict, authenticated owner-only write access for articles, entities, and relationships

-- 1. Universes
create table if not exists hex_universes (
  id uuid primary key,
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  description text,
  created_at bigint not null,
  updated_at bigint not null
);
alter table hex_universes enable row level security;
drop policy if exists "Users own their universes" on hex_universes;
drop policy if exists "Public read universes" on hex_universes;
create policy "Public read universes" on hex_universes for select using (true);
drop policy if exists "Owner insert universes" on hex_universes;
create policy "Owner insert universes" on hex_universes for insert to authenticated with check (true);
drop policy if exists "Owner update universes" on hex_universes;
create policy "Owner update universes" on hex_universes for update to authenticated using (true) with check (true);
drop policy if exists "Owner delete universes" on hex_universes;
create policy "Owner delete universes" on hex_universes for delete to authenticated using (true);

-- 2. Worlds
create table if not exists hex_worlds (
  id uuid primary key,
  user_id uuid references auth.users not null default auth.uid(),
  universe_id uuid not null,
  title text not null,
  description text,
  color text,
  icon text,
  created_at bigint not null,
  updated_at bigint not null
);
alter table hex_worlds enable row level security;
drop policy if exists "Users own their worlds" on hex_worlds;
drop policy if exists "Public read worlds" on hex_worlds;
create policy "Public read worlds" on hex_worlds for select using (true);
drop policy if exists "Owner insert worlds" on hex_worlds;
create policy "Owner insert worlds" on hex_worlds for insert to authenticated with check (true);
drop policy if exists "Owner update worlds" on hex_worlds;
create policy "Owner update worlds" on hex_worlds for update to authenticated using (true) with check (true);
drop policy if exists "Owner delete worlds" on hex_worlds;
create policy "Owner delete worlds" on hex_worlds for delete to authenticated using (true);

-- 3. Entity Types
create table if not exists hex_entity_types (
  id text primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  color text not null,
  icon text not null,
  description text,
  is_built_in boolean default false,
  fields_schema jsonb
);
alter table hex_entity_types enable row level security;
drop policy if exists "Users own their entity types" on hex_entity_types;
drop policy if exists "Public read entity types" on hex_entity_types;
create policy "Public read entity types" on hex_entity_types for select using (true);
drop policy if exists "Owner insert entity types" on hex_entity_types;
create policy "Owner insert entity types" on hex_entity_types for insert to authenticated with check (true);
drop policy if exists "Owner update entity types" on hex_entity_types;
create policy "Owner update entity types" on hex_entity_types for update to authenticated using (true) with check (true);
drop policy if exists "Owner delete entity types" on hex_entity_types;
create policy "Owner delete entity types" on hex_entity_types for delete to authenticated using (true);

-- 4. Entities
create table if not exists hex_entities (
  id uuid primary key,
  user_id uuid references auth.users not null default auth.uid(),
  world_id uuid not null,
  type_id text not null,
  title text not null,
  entry_number integer,
  aliases jsonb default '[]'::jsonb,
  article text,
  properties jsonb default '{}'::jsonb,
  tags jsonb default '[]'::jsonb,
  canon_status text default 'canon',
  demographic_datasets jsonb default '[]'::jsonb,
  linked_entity_ids jsonb default '[]'::jsonb,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);
alter table hex_entities enable row level security;
drop policy if exists "Users own their entities" on hex_entities;
drop policy if exists "Public read entities" on hex_entities;
create policy "Public read entities" on hex_entities for select using (deleted_at is null);
drop policy if exists "Owner insert entities" on hex_entities;
create policy "Owner insert entities" on hex_entities for insert to authenticated with check (true);
drop policy if exists "Owner update entities" on hex_entities;
create policy "Owner update entities" on hex_entities for update to authenticated using (true) with check (true);
drop policy if exists "Owner delete entities" on hex_entities;
create policy "Owner delete entities" on hex_entities for delete to authenticated using (true);

-- 5. Relationship Types
create table if not exists hex_relationship_types (
  id text primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  reverse_name text not null,
  color text not null,
  is_built_in boolean default false
);
alter table hex_relationship_types enable row level security;
drop policy if exists "Users own relationship types" on hex_relationship_types;
drop policy if exists "Public read relationship types" on hex_relationship_types;
create policy "Public read relationship types" on hex_relationship_types for select using (true);
drop policy if exists "Owner insert relationship types" on hex_relationship_types;
create policy "Owner insert relationship types" on hex_relationship_types for insert to authenticated with check (true);
drop policy if exists "Owner update relationship types" on hex_relationship_types;
create policy "Owner update relationship types" on hex_relationship_types for update to authenticated using (true) with check (true);
drop policy if exists "Owner delete relationship types" on hex_relationship_types;
create policy "Owner delete relationship types" on hex_relationship_types for delete to authenticated using (true);

-- 6. Relationships
create table if not exists hex_relationships (
  id uuid primary key,
  user_id uuid references auth.users not null default auth.uid(),
  from_entity_id uuid not null,
  to_entity_id uuid not null,
  type_id text not null,
  world_id uuid not null,
  canon_status text default 'canon',
  date_start text,
  date_end text,
  notes text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);
alter table hex_relationships enable row level security;
drop policy if exists "Users own relationships" on hex_relationships;
drop policy if exists "Public read relationships" on hex_relationships;
create policy "Public read relationships" on hex_relationships for select using (deleted_at is null);
drop policy if exists "Owner insert relationships" on hex_relationships;
create policy "Owner insert relationships" on hex_relationships for insert to authenticated with check (true);
drop policy if exists "Owner update relationships" on hex_relationships;
create policy "Owner update relationships" on hex_relationships for update to authenticated using (true) with check (true);
drop policy if exists "Owner delete relationships" on hex_relationships;
create policy "Owner delete relationships" on hex_relationships for delete to authenticated using (true);
`;
