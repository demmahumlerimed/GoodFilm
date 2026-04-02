/**
 * GoodFilm — Multi-source API management
 *
 * Centralizes API configuration and fetch utilities for:
 *   - TMDB    (The Movie Database) — requires VITE_TMDB_API_KEY or VITE_TMDB_BEARER
 *   - TVMaze  — free, no API key required
 *   - Trakt   — requires VITE_TRAKT_CLIENT_ID
 *   - Watchmode — requires VITE_WATCHMODE_API_KEY
 */

import { TMDB_API_KEY, TMDB_BEARER, USE_BEARER, API_BASE } from "../config";

// ── TMDB ──────────────────────────────────────────────────────────────────────

export const TMDB_BASE = API_BASE;

function getTMDBHeaders() {
  if (USE_BEARER) {
    return { Authorization: `Bearer ${TMDB_BEARER}`, "Content-Type": "application/json" };
  }
  return { "Content-Type": "application/json" };
}

function buildTMDBUrl(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  if (!USE_BEARER && TMDB_API_KEY) url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export async function tmdbApiFetch(path, params = {}) {
  const res = await fetch(buildTMDBUrl(path, params), { headers: getTMDBHeaders() });
  if (!res.ok) throw new Error(`TMDB API failed: ${res.status} ${path}`);
  return res.json();
}

// ── TVMaze ────────────────────────────────────────────────────────────────────
// TVMaze is a free API — no key required.

export const TVMAZE_BASE = "https://api.tvmaze.com";

async function tvmazeFetch(path, params = {}) {
  const url = new URL(`${TVMAZE_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TVMaze API failed: ${res.status} ${path}`);
  return res.json();
}

/**
 * Fetches TV shows airing today from TVMaze, then resolves each to TMDB data
 * so they are fully compatible with the rest of the app (proper poster paths, IDs, etc.).
 * Limits to 12 shows to keep TMDB search calls manageable.
 */
export async function fetchAiringToday() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const schedule = await tvmazeFetch("/schedule", { country: "US", date: today });

  // Collect unique show names from the schedule
  const seen = new Set();
  const showNames = [];
  for (const ep of schedule) {
    const show = ep.show;
    if (!show || seen.has(show.id)) continue;
    seen.add(show.id);
    showNames.push(show.name);
    if (showNames.length >= 12) break;
  }

  // Resolve each show name to TMDB data for poster paths and canonical IDs
  const results = await Promise.all(
    showNames.map((name) =>
      tmdbApiFetch("/search/tv", { query: name })
        .then((res) => res.results?.[0] ?? null)
        .catch(() => null)
    )
  );

  // Deduplicate and normalize to MediaItem shape
  const seen2 = new Set();
  return results
    .filter(Boolean)
    .filter((item) => {
      if (seen2.has(item.id)) return false;
      seen2.add(item.id);
      return true;
    })
    .slice(0, 18)
    .map((show) => ({
      id: show.id,
      name: show.name,
      media_type: "tv",
      poster_path: show.poster_path ?? null,
      backdrop_path: show.backdrop_path ?? null,
      first_air_date: show.first_air_date ?? null,
      vote_average: show.vote_average ?? null,
      overview: show.overview ?? null,
    }));
}

// ── Trakt ─────────────────────────────────────────────────────────────────────
// Trakt requires a Client ID. Set VITE_TRAKT_CLIENT_ID in your .env file.
// Register a free app at: https://trakt.tv/oauth/applications

export const TRAKT_CLIENT_ID = import.meta.env.VITE_TRAKT_CLIENT_ID ?? "";

// In dev, Vite proxies /api/trakt → https://api.trakt.tv to avoid CORS.
// In production, requests go directly (deploy behind a domain Trakt allows,
// or route through a serverless function).
const TRAKT_BASE = import.meta.env.DEV ? "/api/trakt" : "https://api.trakt.tv";

function getTraktHeaders() {
  return {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": TRAKT_CLIENT_ID,
  };
}

async function traktFetch(path, params = {}) {
  const base = `${location.origin}${TRAKT_BASE}`;
  const url = new URL(`${base}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const res = await fetch(url.toString(), { headers: getTraktHeaders() });
  if (!res.ok) throw new Error(`Trakt API failed: ${res.status} ${path}`);
  return res.json();
}

/**
 * Fetches the most anticipated TV shows from Trakt, then enriches each with
 * TMDB data (poster paths, overviews, ratings) using the TMDB IDs from Trakt.
 * Falls back to an empty array if VITE_TRAKT_CLIENT_ID is not configured.
 */
export async function fetchMostAnticipated() {
  if (!TRAKT_CLIENT_ID) {
    console.warn(
      "[GoodFilm] VITE_TRAKT_CLIENT_ID is not set. " +
      "The Most Anticipated row requires a Trakt API key. " +
      "Register a free app at https://trakt.tv/oauth/applications"
    );
    return [];
  }

  const anticipated = await traktFetch("/shows/anticipated", { limit: 15 });

  // Extract TMDB IDs from Trakt response
  const tmdbIds = anticipated
    .map((entry) => entry.show?.ids?.tmdb)
    .filter(Boolean);

  // Batch-fetch TMDB show details for poster paths
  const details = await Promise.all(
    tmdbIds.map((id) =>
      tmdbApiFetch(`/tv/${id}`).catch(() => null)
    )
  );

  return details
    .filter(Boolean)
    .map((show) => ({
      id: show.id,
      name: show.name,
      media_type: "tv",
      poster_path: show.poster_path ?? null,
      backdrop_path: show.backdrop_path ?? null,
      first_air_date: show.first_air_date ?? null,
      vote_average: show.vote_average ?? null,
      overview: show.overview ?? null,
    }));
}

// ── Watchmode ─────────────────────────────────────────────────────────────────
// Watchmode provides streaming availability data.
// Set VITE_WATCHMODE_API_KEY in your .env file.
// Get a free key at: https://api.watchmode.com

export const WATCHMODE_BASE = "https://api.watchmode.com/v1";
export const WATCHMODE_API_KEY = import.meta.env.VITE_WATCHMODE_API_KEY ?? "";

export async function watchmodeFetch(path, params = {}) {
  if (!WATCHMODE_API_KEY) {
    console.warn("[GoodFilm] VITE_WATCHMODE_API_KEY is not set. Watchmode features will be unavailable.");
    throw new Error("Watchmode API key not configured");
  }
  const url = new URL(`${WATCHMODE_BASE}${path}`);
  url.searchParams.set("apiKey", WATCHMODE_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Watchmode API failed: ${res.status} ${path}`);
  return res.json();
}

/**
 * Fetches streaming availability for a title via Watchmode.
 * Two-step: search TMDB ID → get Watchmode title ID → get sources.
 * @param {number} tmdbId - TMDB title ID
 * @param {"movie"|"tv"} type - media type
 * @returns {Promise<Array>} - array of source objects with name, type, web_url, source_id
 */
export async function fetchWatchmodeSources(tmdbId, type = "movie") {
  if (!WATCHMODE_API_KEY) return [];
  try {
    const field = type === "movie" ? "tmdb_movie_id" : "tmdb_tv_id";
    const searchRes = await fetch(
      `${WATCHMODE_BASE}/search/?apiKey=${WATCHMODE_API_KEY}&search_field=${field}&search_value=${tmdbId}`
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const wmId = searchData?.title_results?.[0]?.id;
    if (!wmId) return [];
    const srcRes = await fetch(
      `${WATCHMODE_BASE}/title/${wmId}/sources/?apiKey=${WATCHMODE_API_KEY}&regions=US`
    );
    if (!srcRes.ok) return [];
    return await srcRes.json();
  } catch {
    return [];
  }
}

// ── AniList ───────────────────────────────────────────────────────────────────
// AniList is a free GraphQL API — no API key required.

const ANILIST_URL = "https://graphql.anilist.co";

const ANIME_GQL = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, isAdult: false, sort: $sort, genre: $genre, season: $season, seasonYear: $seasonYear, status: $status) {
        id
        title { romaji english }
        coverImage { large }
        bannerImage
        averageScore
        seasonYear
        season
        description(asHtml: false)
        genres
      }
    }
  }
`;

async function anilistFetch(variables) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query: ANIME_GQL, variables }),
  });
  if (!res.ok) throw new Error(`AniList API failed: ${res.status}`);
  const { data } = await res.json();
  return (data?.Page?.media || []).map((a) => ({
    id: a.id,
    name: a.title?.english || a.title?.romaji || "Unknown",
    poster_path: a.coverImage?.large || null,   // full URL from AniList CDN
    backdrop_path: a.bannerImage || null,         // full URL
    vote_average: (a.averageScore || 0) / 10,
    media_type: "tv",
    first_air_date: a.seasonYear ? `${a.seasonYear}-01-01` : "",
    overview: (a.description || "").replace(/<[^>]*>/g, ""),
    genre_ids: [],
  }));
}

export const fetchAnilistTrending  = (genre = null, limit = 20) =>
  anilistFetch({ page: 1, perPage: limit, sort: ["TRENDING_DESC"],   ...(genre ? { genre } : {}) });
export const fetchAnilistPopular   = (genre = null, limit = 20) =>
  anilistFetch({ page: 1, perPage: limit, sort: ["POPULARITY_DESC"], ...(genre ? { genre } : {}) });
export const fetchAnilistTopRated  = (genre = null, limit = 20) =>
  anilistFetch({ page: 1, perPage: limit, sort: ["SCORE_DESC"],      ...(genre ? { genre } : {}) });
export const fetchAnilistSeasonal  = (season, seasonYear, limit = 20) =>
  anilistFetch({ page: 1, perPage: limit, sort: ["POPULARITY_DESC"], season, seasonYear, status: "RELEASING" });

// ── TVDB ──────────────────────────────────────────────────────────────────────
// TVDB requires a JWT token obtained by POSTing your API key to /login.
// Token is valid for ~24h; cached in module scope to avoid repeat logins.

const TVDB_BASE    = "https://api4.thetvdb.com/v4";
const TVDB_API_KEY = import.meta.env.VITE_TVDB_API_KEY || "";
let _tvdbToken  = null;
let _tvdbExpiry = 0;

async function tvdbToken() {
  if (_tvdbToken && Date.now() < _tvdbExpiry) return _tvdbToken;
  if (!TVDB_API_KEY) return null;
  try {
    const res  = await fetch(`${TVDB_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: TVDB_API_KEY }),
    });
    const data = await res.json();
    _tvdbToken  = data?.data?.token ?? null;
    _tvdbExpiry = Date.now() + 23 * 3600 * 1000;
    return _tvdbToken;
  } catch {
    return null;
  }
}

export async function tvdbFetch(path, params = {}) {
  const token = await tvdbToken();
  if (!token) return null;
  const url = new URL(`${TVDB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(String(k), String(v)));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}
