/**
 * GoodFilm — Central configuration
 * All external service credentials are read from Vite env vars (import.meta.env).
 * The app will warn in the console and degrade gracefully if values are missing.
 */

function requireEnv(key: string, fallback?: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (!value && !fallback) {
    console.warn(`[GoodFilm] Missing env var: ${key}. Some features may be unavailable.`);
    return "";
  }
  return value ?? fallback ?? "";
}

// ── TMDB ────────────────────────────────────────────────────────────────────
export const TMDB_API_KEY   = requireEnv("VITE_TMDB_API_KEY");
export const TMDB_BEARER    = requireEnv("VITE_TMDB_BEARER", "");
export const USE_BEARER     = Boolean(TMDB_BEARER);

export const API_BASE       = "https://api.themoviedb.org/3";
export const POSTER_BASE    = "https://image.tmdb.org/t/p/w500";
export const BACKDROP_BASE  = "https://image.tmdb.org/t/p/w1280";

// ── OMDB ────────────────────────────────────────────────────────────────────
export const OMDB_API_KEY   = requireEnv("VITE_OMDB_API_KEY");
export const OMDB_BASE      = "https://www.omdbapi.com";
export const IMDB_API_BASE  = "https://api.imdbapi.dev";

// ── Supabase ────────────────────────────────────────────────────────────────
export const SUPABASE_URL       = requireEnv("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY  = requireEnv("VITE_SUPABASE_ANON_KEY");
export const HAS_SUPABASE       = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// ── Local Storage ────────────────────────────────────────────────────────────
export const STORAGE_KEY         = "goodfilm_library";
export const BACKUP_KEY          = "goodfilm_backup";
export const LIBRARY_META_KEY    = "goodfilm_library_meta";
export const PROFILE_STORAGE_KEY = "goodfilm_profile";

// ── Cloud DB ─────────────────────────────────────────────────────────────────
export const CLOUD_TABLE = "goodfilm_libraries";

export const CLOUD_SETUP_SQL = `create table if not exists public.goodfilm_libraries (
  user_id uuid primary key,
  email text,
  library jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.goodfilm_libraries enable row level security;

drop policy if exists "Users can read own library" on public.goodfilm_libraries;
create policy "Users can read own library"
on public.goodfilm_libraries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own library" on public.goodfilm_libraries;
create policy "Users can insert own library"
on public.goodfilm_libraries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own library" on public.goodfilm_libraries;
create policy "Users can update own library"
on public.goodfilm_libraries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);`;
