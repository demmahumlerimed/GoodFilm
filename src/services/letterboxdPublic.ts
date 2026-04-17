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

const LB_POPULAR_URL = "https://letterboxd.com/films/popular/this/week/";
const LB_TOP_250_URL = "https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/";

const CACHE_KEY_POPULAR = "gf_lb_popular_v1";
const CACHE_KEY_TOP250 = "gf_lb_top250_v1";
const POPULAR_TTL_MS = 1000 * 60 * 60; // 1 hour
const TOP250_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// ── Types ─────────────────────────────────────────────────────────────────────

type LetterboxdFilm = {
  slug: string;
  name: string;
  year?: string;
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

// ── HTML fetch + parse ────────────────────────────────────────────────────────

async function fetchLetterboxdHtml(url: string): Promise<string> {
  const res = await fetch(`${CORS_RELAY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Letterboxd fetch failed: ${res.status}`);
  return res.text();
}

/**
 * Parse the HTML of a Letterboxd list/popular page and extract film slugs.
 * Letterboxd renders each film as:
 *   <li class="poster-container">
 *     <div class="film-poster"
 *          data-film-slug="the-godfather"
 *          data-film-name="The Godfather"
 *          data-film-release-year="1972"
 *          ...>
 */
function parseLetterboxdFilms(html: string): LetterboxdFilm[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const posters = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-film-slug]")
  );
  const seen = new Set<string>();
  const out: LetterboxdFilm[] = [];
  for (const el of posters) {
    const slug = el.getAttribute("data-film-slug") || "";
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    // Name is rarely the slug's title-case — prefer explicit attribute.
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
    const params: Record<string, string | number> = { query: film.name };
    if (film.year) params.year = film.year;
    const res = await tmdbFetch<{ results?: MediaItem[] }>(
      "/search/movie",
      params
    );
    const hits = res.results || [];
    if (!hits.length) return null;

    // Prefer exact title+year match
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
    const html = await fetchLetterboxdHtml(LB_POPULAR_URL);
    const films = parseLetterboxdFilms(html);
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
    const html = await fetchLetterboxdHtml(LB_TOP_250_URL);
    const films = parseLetterboxdFilms(html);
    const resolved = await resolveMany(films, limit);
    if (resolved.length) writeCache(CACHE_KEY_TOP250, resolved);
    return resolved;
  } catch {
    const stale = readCache<MediaItem[]>(CACHE_KEY_TOP250, Infinity);
    return stale?.slice(0, limit) ?? [];
  }
}

/** For debugging / admin: wipe cached Letterboxd data. */
export function clearLetterboxdCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY_POPULAR);
    localStorage.removeItem(CACHE_KEY_TOP250);
  } catch {
    /* ignore */
  }
}
