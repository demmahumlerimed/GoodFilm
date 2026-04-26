/**
 * GoodFilm — Letterboxd Public Lists Service
 *
 * Pulls community-curated lists from Letterboxd's PUBLIC list pages (no API
 * key, no OAuth), then resolves each film to a TMDb ID so it plugs into the
 * existing detail/watch flow.
 *
 * Sources:
 *   - Popular This Week: https://letterboxd.com/films/popular/this/week/
 *   - Top 250 Narrative Features: https://letterboxd.com/films/ajax/popular/by/rating/size/small/page/1/
 *     (fallback: the community Top 250 list)
 *
 * CORS reality: letterboxd.com does not set Access-Control-Allow-Origin, so a
 * pure-browser fetch is blocked. We use a lightweight public CORS relay
 * (allorigins) as a best-effort — if the relay is down or the user is offline,
 * the cached list is returned, and if there is no cache, an empty list.
 *
 * Caching: localStorage with TTL. Top-250 is stable (7-day TTL). Popular
 * refreshes hourly.
 *
 * NOTE: This is intended as a pragmatic MVP. For production reliability, this
 * service should move behind a serverless function (Vercel Edge / Netlify)
 * that does the letterboxd fetch server-side and caches aggressively. The
 * rest of the app code — `MediaItem[]` return type, TMDb resolution — would
 * stay identical.
 */

import type { MediaItem } from "../types";
import { tmdbFetch } from "./tmdb";

// ── Config ────────────────────────────────────────────────────────────────────

const CORS_RELAY = "https://api.allorigins.win/raw?url=";

const LB_POPULAR_URL         = "https://letterboxd.com/films/popular/this/week/";
const LB_POPULAR_MONTH_URL   = "https://letterboxd.com/films/popular/this/month/";
const LB_TOP_250_URL         = "https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/";
const LB_SIGHT_SOUND_URL     = "https://letterboxd.com/sight_and_sound/list/sight-sound-2022-the-official-top-250-films/";
const LB_HORROR_URL          = "https://letterboxd.com/films/by/rating/genre/horror/";
const LB_ANIMATION_URL       = "https://letterboxd.com/films/by/rating/genre/animation/";
const LB_COMEDY_URL          = "https://letterboxd.com/films/by/rating/genre/comedy/";
const LB_DECADE_2020S_URL    = "https://letterboxd.com/films/by/rating/decade/2020s/";
const LB_DECADE_2010S_URL    = "https://letterboxd.com/films/by/rating/decade/2010s/";
const LB_TOP250_FANS_URL     = "https://letterboxd.com/official/list/top-250-films-with-the-most-fans/";
const LB_MUST_WATCH_URL      = "https://letterboxd.com/fcbarcelona/list/movies-everyone-should-watch-at-least-once/";
const LB_1001_MOVIES_URL     = "https://letterboxd.com/peterstanley/list/1001-movies-you-must-see-before-you-die/";
const LB_TOP250_HORROR_URL   = "https://letterboxd.com/official/list/top-250-horror-films/";
const LB_TOP250_SCIFI_URL    = "https://letterboxd.com/official/list/top-250-science-fiction-films/";
const LB_TV_SHOWS_URL        = "https://letterboxd.com/jkleym/list/tv-shows/";

const CACHE_KEY_POPULAR         = "gf_lb_popular_v1";
const CACHE_KEY_POPULAR_MONTH   = "gf_lb_popular_month_v1";
const CACHE_KEY_TOP250          = "gf_lb_top250_v1";
const CACHE_KEY_SIGHT_SOUND     = "gf_lb_sight_sound_v1";
const CACHE_KEY_HORROR          = "gf_lb_horror_v1";
const CACHE_KEY_ANIMATION       = "gf_lb_animation_v1";
const CACHE_KEY_COMEDY          = "gf_lb_comedy_v1";
const CACHE_KEY_2020S           = "gf_lb_2020s_v1";
const CACHE_KEY_2010S           = "gf_lb_2010s_v1";
const CACHE_KEY_TOP250_FANS     = "gf_lb_top250_fans_v1";
const CACHE_KEY_MUST_WATCH      = "gf_lb_must_watch_v1";
const CACHE_KEY_1001_MOVIES     = "gf_lb_1001_movies_v1";
const CACHE_KEY_TOP250_HORROR   = "gf_lb_top250_horror_v1";
const CACHE_KEY_TOP250_SCIFI    = "gf_lb_top250_scifi_v1";
const CACHE_KEY_TV_SHOWS        = "gf_lb_tv_shows_v1";

const POPULAR_TTL_MS  = 1000 * 60 * 60;          // 1 hour
const MONTH_TTL_MS    = 1000 * 60 * 60 * 6;       // 6 hours
const TOP250_TTL_MS   = 1000 * 60 * 60 * 24 * 7;  // 7 days
const GENRE_TTL_MS    = 1000 * 60 * 60 * 24 * 3;  // 3 days
const DECADE_TTL_MS   = 1000 * 60 * 60 * 24 * 7;  // 7 days

// ── Types ─────────────────────────────────────────────────────────────────────

type LetterboxdFilm = {
  slug: string;
  name: string;
  year?: string;
  tmdbId?: number;
};

type CacheEntry<T> = {
  ts: number;
  data: T;
};

// ── Cache helpers ─────────────────────────────────────────────────────────────

function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.ts > ttl) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota errors are non-fatal */
  }
}

// ── Fetch: serverless proxy (prod) or CORS relay (local dev) ─────────────────

const IS_DEV =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

/**
 * Fetch a Letterboxd list and return parsed film entries.
 *
 * Production  → calls /api/letterboxd (Vercel Edge Function, server-side fetch,
 *               no CORS issues, supports official API when env vars are set).
 * Development → falls back to allorigins CORS relay so local dev works without
 *               a running serverless environment.
 */
async function fetchLetterboxdList(url: string): Promise<LetterboxdFilm[]> {
  if (!IS_DEV) {
    const res = await fetch(
      `/api/letterboxd?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) throw new Error(`/api/letterboxd ${res.status}`);
    const data = await res.json() as Array<{
      slug: string;
      name: string;
      year?: string;
      tmdbId?: number;
    }>;
    return data.map(({ slug, name, year, tmdbId }) => ({ slug, name, year, tmdbId }));
  }

  // Local dev: CORS relay + browser DOMParser
  const html = await fetch(`${CORS_RELAY}${encodeURIComponent(url)}`).then(r => {
    if (!r.ok) throw new Error(`CORS relay ${r.status}`);
    return r.text();
  });
  const doc = new DOMParser().parseFromString(html, "text/html");
  const posters = Array.from(doc.querySelectorAll<HTMLElement>("[data-film-slug]"));
  const seen = new Set<string>();
  const out: LetterboxdFilm[] = [];
  for (const el of posters) {
    const slug = el.getAttribute("data-film-slug") || "";
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const name =
      el.getAttribute("data-film-name") ||
      el.getAttribute("data-film-link-name") ||
      slug.replace(/-/g, " ");
    const year = el.getAttribute("data-film-release-year") || undefined;
    out.push({ slug, name, year });
  }
  return out;
}

// ── TMDb resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a Letterboxd film → TMDb MediaItem via TMDb `/search/movie`.
 *
 * We prefer an exact title-year match. Missing year is ok (falls back to the
 * top search hit).
 */
async function resolveOne(film: LetterboxdFilm): Promise<MediaItem | null> {
  try {
    // Fast path: official API returned a TMDB ID — fetch directly, no search needed
    if (film.tmdbId) {
      const data = await tmdbFetch<MediaItem>(`/movie/${film.tmdbId}`, {});
      if (data?.id) return { ...data, media_type: "movie" };
    }

    const params: Record<string, string | number> = { query: film.name };
    if (film.year) params.year = film.year;
    const res = await tmdbFetch<{ results?: MediaItem[] }>("/search/movie", params);
    const hits = res.results || [];
    if (!hits.length) return null;

    const norm = film.name.toLowerCase();
    const exact = hits.find((h) => {
      const ht = (h.title || h.name || "").toLowerCase();
      const hy = (h.release_date || h.first_air_date || "").slice(0, 4);
      return ht === norm && (!film.year || hy === film.year);
    });
    const picked = exact ?? hits[0];
    return { ...picked, media_type: "movie" };
  } catch {
    return null;
  }
}

async function resolveMany(
  films: LetterboxdFilm[],
  limit: number
): Promise<MediaItem[]> {
  // Batch in chunks of 6 to keep TMDb happy
  const slice = films.slice(0, limit);
  const out: MediaItem[] = [];
  const CHUNK = 6;
  for (let i = 0; i < slice.length; i += CHUNK) {
    const chunk = slice.slice(i, i + CHUNK);
    const resolved = await Promise.all(chunk.map(resolveOne));
    for (const item of resolved) if (item) out.push(item);
  }
  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchLetterboxdPopularThisWeek(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_POPULAR, POPULAR_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_POPULAR_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_POPULAR, resolved);
    return resolved;
  } catch {
    // Serve any stale cache as a last resort
    const stale = readCache<MediaItem[]>(CACHE_KEY_POPULAR, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

export async function fetchLetterboxdTop250(
  limit = 50
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_TOP250, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_TOP_250_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_TOP250, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_TOP250, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Popular films this month — refreshes every 6 hours. */
export async function fetchLetterboxdPopularThisMonth(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_POPULAR_MONTH, MONTH_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_POPULAR_MONTH_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_POPULAR_MONTH, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_POPULAR_MONTH, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Sight & Sound 2022 official Top 250. Cached for 7 days. */
export async function fetchLetterboxdSightAndSound(
  limit = 30
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_SIGHT_SOUND, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_SIGHT_SOUND_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_SIGHT_SOUND, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_SIGHT_SOUND, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Highest-rated Horror films on Letterboxd. Cached 3 days. */
export async function fetchLetterboxdBestHorror(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_HORROR, GENRE_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_HORROR_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_HORROR, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_HORROR, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Highest-rated Animation films on Letterboxd. Cached 3 days. */
export async function fetchLetterboxdBestAnimation(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_ANIMATION, GENRE_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_ANIMATION_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_ANIMATION, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_ANIMATION, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Highest-rated Comedy films on Letterboxd. Cached 3 days. */
export async function fetchLetterboxdBestComedy(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_COMEDY, GENRE_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_COMEDY_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_COMEDY, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_COMEDY, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Highest-rated films of the 2020s on Letterboxd. Cached 7 days. */
export async function fetchLetterboxdBestOf2020s(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_2020S, DECADE_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_DECADE_2020S_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_2020S, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_2020S, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Highest-rated films of the 2010s on Letterboxd. Cached 7 days. */
export async function fetchLetterboxdBestOf2010s(
  limit = 20
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_2010S, DECADE_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);

  try {
    const films = await fetchLetterboxdList(LB_DECADE_2010S_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_2010S, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_2010S, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Resolve a Letterboxd entry as a TV show via TMDb /search/tv. */
async function resolveOneTV(film: LetterboxdFilm): Promise<MediaItem | null> {
  try {
    // Fast path: official API returned a TMDB ID
    if (film.tmdbId) {
      const data = await tmdbFetch<MediaItem>(`/tv/${film.tmdbId}`, {});
      if (data?.id) return { ...data, media_type: "tv" };
    }

    const params: Record<string, string | number> = { query: film.name };
    if (film.year) params.first_air_date_year = film.year;
    const res = await tmdbFetch<{ results?: MediaItem[] }>("/search/tv", params);
    const hits = res.results || [];
    if (!hits.length) return null;
    const norm = film.name.toLowerCase();
    const exact = hits.find((h) => (h.name || h.title || "").toLowerCase() === norm);
    const picked = exact ?? hits[0];
    return { ...picked, media_type: "tv" };
  } catch {
    return null;
  }
}

async function resolveManyTV(
  films: LetterboxdFilm[],
  limit: number
): Promise<MediaItem[]> {
  const slice = films.slice(0, limit);
  const out: MediaItem[] = [];
  const CHUNK = 6;
  for (let i = 0; i < slice.length; i += CHUNK) {
    const chunk = slice.slice(i, i + CHUNK);
    const resolved = await Promise.all(chunk.map(resolveOneTV));
    for (const item of resolved) if (item) out.push(item);
  }
  return out;
}

/** Top 250 films with the most fans on Letterboxd. Cached 7 days. */
export async function fetchLetterboxdTop250MostFans(
  limit = 30
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_TOP250_FANS, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);
  try {
    const films = await fetchLetterboxdList(LB_TOP250_FANS_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_TOP250_FANS, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_TOP250_FANS, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Movies everyone should watch at least once. Cached 7 days. */
export async function fetchLetterboxdMustWatchMovies(
  limit = 30
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_MUST_WATCH, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);
  try {
    const films = await fetchLetterboxdList(LB_MUST_WATCH_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_MUST_WATCH, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_MUST_WATCH, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** 1001 Movies You Must See Before You Die list. Cached 7 days. */
export async function fetchLetterboxd1001Movies(
  limit = 40
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_1001_MOVIES, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);
  try {
    const films = await fetchLetterboxdList(LB_1001_MOVIES_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_1001_MOVIES, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_1001_MOVIES, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Top 250 Horror films on Letterboxd. Cached 7 days. */
export async function fetchLetterboxdTop250Horror(
  limit = 30
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_TOP250_HORROR, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);
  try {
    const films = await fetchLetterboxdList(LB_TOP250_HORROR_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_TOP250_HORROR, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_TOP250_HORROR, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Top 250 Science Fiction films on Letterboxd. Cached 7 days. */
export async function fetchLetterboxdTop250SciFi(
  limit = 30
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_TOP250_SCIFI, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);
  try {
    const films = await fetchLetterboxdList(LB_TOP250_SCIFI_URL);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_TOP250_SCIFI, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_TOP250_SCIFI, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** Curated TV shows list from Letterboxd (resolved via TMDb /search/tv). Cached 7 days. */
export async function fetchLetterboxdTVShows(
  limit = 30
): Promise<MediaItem[]> {
  const cached = readCache<MediaItem[]>(CACHE_KEY_TV_SHOWS, TOP250_TTL_MS);
  if (cached?.length) return cached.slice(0, limit);
  try {
    const films = await fetchLetterboxdList(LB_TV_SHOWS_URL);
    const resolved = await resolveManyTV(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_TV_SHOWS, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_TV_SHOWS, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** For debugging / admin: wipe all cached Letterboxd data. */
export function clearLetterboxdCache(): void {
  const keys = [
    CACHE_KEY_POPULAR, CACHE_KEY_POPULAR_MONTH, CACHE_KEY_TOP250,
    CACHE_KEY_SIGHT_SOUND, CACHE_KEY_HORROR, CACHE_KEY_ANIMATION,
    CACHE_KEY_COMEDY, CACHE_KEY_2020S, CACHE_KEY_2010S,
    CACHE_KEY_TOP250_FANS, CACHE_KEY_MUST_WATCH, CACHE_KEY_1001_MOVIES,
    CACHE_KEY_TOP250_HORROR, CACHE_KEY_TOP250_SCIFI, CACHE_KEY_TV_SHOWS,
  ];
  try { keys.forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}
