import {
  TMDB_API_KEY, TMDB_BEARER, USE_BEARER,
  API_BASE, IMDB_API_BASE,
} from "../config";
import type { MediaItem, MediaType, LibraryItem, IMDbTitleData } from "../types";
import { getTitle, getYear } from "../utils/library";

// ── Request helpers ───────────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  if (USE_BEARER) {
    return {
      Authorization: `Bearer ${TMDB_BEARER}`,
      "Content-Type": "application/json",
    };
  }
  return { "Content-Type": "application/json" };
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const url = new URL(`${API_BASE}${path}`);
  if (!USE_BEARER && TMDB_API_KEY) url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

// ── In-memory request cache ───────────────────────────────────────────────────
// Prevents duplicate TMDB calls when multiple components request the same
// endpoint (e.g. a movie shown in a rail and then opened in the detail panel).
// TTL: 1 min for search results (volatile), 5 min for everything else.

const _tmdbCache = new Map<string, { data: unknown; exp: number }>();

export async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = buildUrl(path, params);
  const now = Date.now();
  const hit = _tmdbCache.get(url);
  if (hit && hit.exp > now) return hit.data as T;

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`TMDB failed: ${res.status} ${path}`);
  const data = await res.json() as T;

  const ttl = path.includes("/search/") ? 60_000 : 300_000;
  _tmdbCache.set(url, { data, exp: now + ttl });

  // Prevent unbounded growth — evict oldest 50 when over 200 entries
  if (_tmdbCache.size > 200) {
    const keys = Array.from(_tmdbCache.keys()).slice(0, 50);
    keys.forEach(k => _tmdbCache.delete(k));
  }

  return data;
}

// ── Logo fetching ─────────────────────────────────────────────────────────────

type LogoResult = { path: string | null; width: number; height: number };

const logoCache = new Map<string, LogoResult>();

export async function fetchTMDBLogoPath(
  mediaType: MediaType,
  id: number
): Promise<LogoResult> {
  const cacheKey = `${mediaType}-${id}`;
  if (logoCache.has(cacheKey)) return logoCache.get(cacheKey)!;

  try {
    const path = mediaType === "movie" ? `/movie/${id}/images` : `/tv/${id}/images`;
    const data = await tmdbFetch<{
      logos?: Array<{
        file_path?: string | null;
        iso_639_1?: string | null;
        vote_average?: number;
        width?: number;
        height?: number;
      }>;
    }>(path, { include_image_language: "en,null" });

    const logos = Array.isArray(data.logos) ? data.logos : [];
    const best = logos
      .filter(l => Boolean(l.file_path) && Boolean(l.width) && Boolean(l.height))
      .map(l => {
        const w = l.width  || 0;
        const h = l.height || 0;
        const ratio  = h > 0 ? w / h : 0;
        const area   = w * h;
        const langScore    = l.iso_639_1 === "en" ? 3 : l.iso_639_1 === null ? 2 : 1;
        const extremePen   = ratio > 8 ? 3 : ratio > 6 ? 1.5 : 0;
        const tinyPen      = h < 120 ? 2 : h < 180 ? 1 : 0;
        const shapeBonus   = ratio >= 2.2 && ratio <= 5.8 ? 2 : ratio >= 1.6 && ratio <= 6.6 ? 1 : 0;
        const qualityScore = langScore * 1_000_000 + shapeBonus * 100_000 + area + (l.vote_average || 0) * 1_000 - extremePen * 100_000 - tinyPen * 100_000;
        return { ...l, w, h, qualityScore };
      })
      .sort((a, b) => b.qualityScore - a.qualityScore)[0];

    const result: LogoResult = { path: best?.file_path || null, width: best?.w || 0, height: best?.h || 0 };
    logoCache.set(cacheKey, result);
    return result;
  } catch {
    const fallback: LogoResult = { path: null, width: 0, height: 0 };
    logoCache.set(cacheKey, fallback);
    return fallback;
  }
}

// ── TMDB search match ─────────────────────────────────────────────────────────

export async function searchTMDBMatchForLibraryItem(
  item: LibraryItem
): Promise<MediaItem | null> {
  const path      = item.mediaType === "tv" ? "/search/tv" : "/search/movie";
  const yearParam = item.mediaType === "tv" ? "first_air_date_year" : "year";
  const query     = item.title.replace(/\([^)]*\)/g, "").trim();
  const params: Record<string, string | number | undefined> = { query };
  if (item.year && item.year !== "—") params[yearParam] = item.year;

  const res     = await tmdbFetch<{ results: MediaItem[] }>(path, params);
  const results = res.results || [];
  if (!results.length) return null;

  const norm  = query.toLowerCase();
  const exact = results.find(c => getTitle(c).toLowerCase() === norm && getYear(c) === item.year);
  if (exact) return exact;

  const sameYear = results.find(c => getYear(c) === item.year);
  return sameYear ?? results[0] ?? null;
}

// ── IMDb API ──────────────────────────────────────────────────────────────────

export async function imdbFetchTitle(imdbId: string): Promise<IMDbTitleData | null> {
  try {
    const res = await fetch(`${IMDB_API_BASE}/titles/${imdbId}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function extractIMDbRating(data: IMDbTitleData | null): number | null {
  if (!data) return null;
  const v = data.rating?.aggregateRating ?? data.ratingsSummary?.aggregateRating;
  return typeof v === "number" ? v : null;
}

export function extractIMDbVotes(data: IMDbTitleData | null): number | null {
  if (!data) return null;
  const v = data.rating?.voteCount ?? data.ratingsSummary?.voteCount;
  return typeof v === "number" ? v : null;
}
