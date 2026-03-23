import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Film,
  Home,  List,
  Play,
  Search,
  Star,
  Tv,
  Upload,
  User,
  X,
  Settings,  LogIn,
  HelpCircle,  LogOut,
  Cloud,
  Mail,
  Lock,
  RefreshCw,
} from "lucide-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TMDB_BEARER = "";
const TMDB_API_KEY = "2abbda52b30975da8104f64238c074ad";
const USE_BEARER = Boolean(TMDB_BEARER);

const API_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";
const IMDB_API_BASE = "https://api.imdbapi.dev";
const OMDB_API_KEY = "ee840519"; // omdbapi.com
const OMDB_BASE = "https://www.omdbapi.com";
const STORAGE_KEY = "goodfilm_library";
const BACKUP_KEY = "goodfilm_backup";
const LIBRARY_META_KEY = "goodfilm_library_meta";const PROFILE_STORAGE_KEY = "goodfilm_profile";const SUPABASE_URL = "https://pdjgsxbvrjiswxpztjxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkamdzeGJ2cmppc3d4cHp0anhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODg2MTUsImV4cCI6MjA4OTI2NDYxNX0.XXyxNEcoiXX1M7sarzL0tOBG3dQjZTps2d5BXqeqW-A";
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase: SupabaseClient | null = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let cloudTableUnavailable = false;
const CLOUD_SETUP_SQL = `create table if not exists public.goodfilm_libraries (
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

type Tab = "home" | "movies" | "series" | "mylist" | "watchlist" | "watched";
type AuthMode = "login" | "signup";
type MediaType = "movie" | "tv";
type AppLanguage = "en";

type MediaItem = {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
};

type Genre = { id: number; name: string };
type SeasonInfo = { season_number: number; name: string; episode_count: number };

type DetailData = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genres?: Genre[];
  seasons?: SeasonInfo[];
  runtime?: number;
  original_language?: string;
  production_companies?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: CastMember[];
    crew?: Array<{ id: number; name: string; job?: string; department?: string }>;
  };
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
};

type IMDbTitleData = {
  id?: string;
  primaryTitle?: string;
  description?: string;
  plot?: string;
  primaryImage?: { url?: string | null };
  rating?: { aggregateRating?: number; voteCount?: number };
  ratingsSummary?: { aggregateRating?: number; voteCount?: number };
  metacritic?: number;
  cast?: Array<{ id?: string; name?: string; characters?: string[] }>;
};

type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

type Episode = {
  id: number;
  episode_number: number;
  name: string;
  runtime?: number | null;
  air_date?: string | null;
};

type VideoResult = {
  id: string;
  key: string;
  site: string;
  type: string;
};

type LibraryItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  rating: number | null;
};

type WatchingProgress = {
  [showId: string]: {
    season: number;
    episodeFilter?: "all" | "watched" | "unwatched";
    selectedEpisodeBySeason: Record<string, number>;
    watchedEpisodesBySeason: Record<string, number[]>;
  };
};

type UserLibrary = {
  watchlist: LibraryItem[];
  watched: LibraryItem[];
  ratings: Record<string, number>;
  watching: WatchingProgress;
  notes: Record<string, string>; // keyFor(item) → user's review/note
};

type ImportExportPayload = {
  version: 1;
  exportedAt: string;
  library: UserLibrary;
};

type CloudUser = {
  id: string;
  email: string;
  provider: "supabase";
};

type CloudLibraryRow = {
  library: UserLibrary;
  updated_at?: string | null;
};

type CloudMode = "unknown" | "ready" | "missing_table" | "disabled";

type UserProfile = {
  username: string;
  avatarUrl: string | null;
  memberSince: string;
  lastLogin: string;
};

type SupabaseRuntimeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}
const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    home: "Home", movies: "Movies", tvShows: "TV Shows", search: "Search", settings: "Settings", language: "Language", data: "Data", importMovies: "Import Movies", exportMovies: "Export Movies", account: "Account", login: "Login", signUp: "Sign Up", logout: "Logout", helpSupport: "Help & Support", myList: "My List", watchlist: "Watchlist", watched: "Watched", back: "Back", details: "Details", synopsis: "Synopsis", cast: "Cast", trailer: "Trailer", externalLink: "External link", openTrailer: "Open Trailer on YouTube", addToWatchlist: "Add to Watchlist", inWatchlist: "In Watchlist", markWatched: "Mark Watched", watchedLabel: "Watched", myRating: "My Rating", episodeTracker: "Episode Tracker", searchResults: "Search Results", bulkLinkTMDB: "Bulk Link TMDB", linking: "Linking...", cloudSyncActive: "Cloud sync active", cloudTableMissing: "Cloud table missing — setup required", cloudSyncChecking: "Cloud sync checking", localAccountMode: "Local account mode", loginRequiredCloud: "Login required for cloud sync", copySetupSql: "Copy setup SQL", signedInAs: "Signed in as", popularMovies: "Popular Movies", trendingNow: "Trending Now", popularTVSeries: "Popular TV Series", topRatedTV: "Top Rated TV", comingSoon: "Coming Soon", rating: "Rating", year: "Year", runtime: "Runtime", genres: "Genres", languageLabel: "Language", studio: "Studio", director: "Director", release: "Release", watchSources: "Watch Sources", searchOn: "Search on", unavailable: "Manual", noVerifiedLinks: "No verified direct links added yet. Open a source site and search manually.", latestMovies: "Latest Movies", latestSeries: "Latest Series", directLink: "Direct", manualAccess: "Manual", watchHint: "Exact page when mapped, homepage otherwise.", fanFavorites: "Fan Favorites", trendingMovies: "Trending Movies", crimeTV: "Crime TV", dramaTV: "Drama TV", sciFiFantasyTV: "Sci-Fi & Fantasy TV", animationTV: "Animation TV", comedyTV: "Comedy TV", helpUnavailable: "Help is not configured yet."
  }
};


function tr(_language: AppLanguage, key: string) {
  return TRANSLATIONS.en[key] || key;
}
function loadLanguage(): AppLanguage {
  return "en";
}

const defaultLibrary: UserLibrary = {
  watchlist: [],
  watched: [],
  ratings: {},
  watching: {},
  notes: {},
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
function getHeaders(): Record<string, string> {
  if (USE_BEARER) {
    return {
      Authorization: `Bearer ${TMDB_BEARER}`,
      "Content-Type": "application/json",
    };
  }
  return { "Content-Type": "application/json" };
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE}${path}`);
  if (!USE_BEARER && TMDB_API_KEY) url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function tmdbFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, params), { headers: getHeaders() });
  if (!res.ok) throw new Error(`TMDB failed: ${res.status}`);
  return res.json();
}

type OmdbData = {
  Title?: string;
  Year?: string;
  Rated?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Awards?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
  BoxOffice?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Response?: string;
};

async function omdbFetch(params: Record<string, string>): Promise<OmdbData | null> {
  try {
    const url = new URL(OMDB_BASE);
    url.searchParams.set("apikey", OMDB_API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data: OmdbData = await res.json();
    return data?.Response === "False" ? null : data;
  } catch {
    return null;
  }
}

async function imdbFetchTitle(imdbId: string): Promise<IMDbTitleData | null> {
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

function extractIMDbRating(data: IMDbTitleData | null): number | null {
  if (!data) return null;
  const value = data.rating?.aggregateRating ?? data.ratingsSummary?.aggregateRating;
  return typeof value === "number" ? value : null;
}

function extractIMDbVotes(data: IMDbTitleData | null): number | null {
  if (!data) return null;
  const value = data.rating?.voteCount ?? data.ratingsSummary?.voteCount;
  return typeof value === "number" ? value : null;
}

async function searchTMDBMatchForLibraryItem(item: LibraryItem): Promise<MediaItem | null> {
  const path = item.mediaType === "tv" ? "/search/tv" : "/search/movie";
  const yearParam = item.mediaType === "tv" ? "first_air_date_year" : "year";
  const query = item.title.replace(/\([^)]*\)/g, "").trim();
  const params: Record<string, string | number | undefined> = { query };
  if (item.year && item.year !== "—") params[yearParam] = item.year;

  const res = await tmdbFetch<{ results: MediaItem[] }>(path, params);
  const results = res.results || [];
  if (!results.length) return null;

  const normalizedTitle = query.toLowerCase();
  const exact = results.find((candidate) => getTitle(candidate).toLowerCase() === normalizedTitle && getYear(candidate) === item.year);
  if (exact) return exact;

  const sameYear = results.find((candidate) => getYear(candidate) === item.year);
  if (sameYear) return sameYear;

  return results[0] || null;
}

const tmdbLogoCache = new Map<string, { path: string | null; width: number; height: number }>();

async function fetchTMDBLogoPath(mediaType: MediaType, id: number): Promise<{ path: string | null; width: number; height: number }> {
  const cacheKey = `${mediaType}-${id}`;
  if (tmdbLogoCache.has(cacheKey)) return tmdbLogoCache.get(cacheKey)!;

  try {
    const path = mediaType === "movie" ? `/movie/${id}/images` : `/tv/${id}/images`;
    const data = await tmdbFetch<{ logos?: Array<{ file_path?: string | null; iso_639_1?: string | null; vote_average?: number; width?: number; height?: number }> }>(path, {
      include_image_language: "en,null",
    });

    const logos = Array.isArray(data.logos) ? data.logos : [];
    const prepared = logos
      .filter((logo) => Boolean(logo.file_path) && Boolean(logo.width) && Boolean(logo.height))
      .map((logo) => {
        const width = logo.width || 0;
        const height = logo.height || 0;
        const ratio = height > 0 ? width / height : 0;
        const area = width * height;
        const langScore = logo.iso_639_1 === "en" ? 3 : logo.iso_639_1 === null ? 2 : 1;
        const extremePenalty = ratio > 8 ? 3 : ratio > 6 ? 1.5 : 0;
        const tinyPenalty = height < 120 ? 2 : height < 180 ? 1 : 0;
        const shapeBonus = ratio >= 2.2 && ratio <= 5.8 ? 2 : ratio >= 1.6 && ratio <= 6.6 ? 1 : 0;
        const qualityScore = langScore * 1000000 + shapeBonus * 100000 + area + (logo.vote_average || 0) * 1000 - extremePenalty * 100000 - tinyPenalty * 100000;
        return { ...logo, width, height, ratio, area, qualityScore };
      })
      .sort((a, b) => b.qualityScore - a.qualityScore);

    const best = prepared[0];
    const result = {
      path: best?.file_path || null,
      width: best?.width || 0,
      height: best?.height || 0,
    };
    tmdbLogoCache.set(cacheKey, result);
    return result;
  } catch {
    const fallback = { path: null, width: 0, height: 0 };
    tmdbLogoCache.set(cacheKey, fallback);
    return fallback;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => runWorker()));
  return results;
}

function getTitle(item: Partial<MediaItem | DetailData>) {
  return item.title || item.name || "Untitled";
}

function getYear(item: Partial<MediaItem | DetailData>) {
  const raw = item.release_date || item.first_air_date;
  return raw ? raw.slice(0, 4) : "—";
}

function normalizeMedia(item: MediaItem, forcedType?: MediaType): LibraryItem {
  const mediaType = forcedType || item.media_type || (item.first_air_date ? "tv" : "movie");
  return {
    id: item.id,
    mediaType,
    title: getTitle(item),
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    year: getYear(item),
    rating: item.vote_average ?? null,
  };
}

function keyFor(item: { id: number; mediaType: MediaType }) {
  return `${item.mediaType}-${item.id}`;
}

function uniqueMediaItems(items: MediaItem[], fallbackType?: MediaType) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const mediaType = item.media_type || (item.first_air_date ? "tv" : fallbackType || "movie");
    const k = keyFor({ id: item.id, mediaType });
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function uniqueRowDefinitions<T extends { id: number; media_type?: MediaType; first_air_date?: string }>(
  rows: Array<{ title: string; items: T[]; mediaType?: MediaType; largeCards?: boolean }>
) {
  const seen = new Set<string>();
  return rows
    .map((row) => {
      const deduped = row.items.filter((item) => {
        const mediaType = row.mediaType || item.media_type || (item.first_air_date ? "tv" : "movie");
        const k = keyFor({ id: item.id, mediaType });
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return { ...row, items: deduped };
    })
    .filter((row) => row.items.length > 0);
}

function buildSyntheticLibraryId(item: any): number {
  const seed = `${item?.title || item?.name || "untitled"}-${item?.year || item?.release_date || item?.first_air_date || "0"}-${item?.mediaType || item?.media_type || item?.listType || "movie"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + 1;
}

function dedupeLibraryItems(items: any[]): LibraryItem[] {
  const map = new Map<string, LibraryItem>();
  items.forEach((item) => {
    if (!item) return;
    const rawId = typeof item.id === "number" ? item.id : Number(item.id);
    const safeId = Number.isNaN(rawId) ? buildSyntheticLibraryId(item) : rawId;

    const mediaType: MediaType =
      item.mediaType === "tv" ||
      item.media_type === "tv" ||
      item.first_air_date ||
      item.type === "series" ||
      item.type === "tv" ||
      item.category === "series"
        ? "tv"
        : "movie";

    const normalized: LibraryItem = {
      id: safeId,
      mediaType,
      title: item.title || item.name || "Untitled",
      posterPath: item.posterPath ?? item.poster_path ?? item.posterUrl ?? null,
      backdropPath: item.backdropPath ?? item.backdrop_path ?? null,
      year: String(item.year || getYear(item) || "—"),
      rating:
        typeof item.userRating === "number"
          ? item.userRating
          : typeof item.rating === "number"
            ? item.rating
            : typeof item.vote_average === "number"
              ? item.vote_average
              : typeof item.imdbRating === "number"
                ? item.imdbRating
                : null,
    };

    map.set(keyFor(normalized), normalized);
  });
  return Array.from(map.values());
}

function normalizeEpisodeNumbers(input: any): number[] {
  return Array.from(
    new Set(
      (Array.isArray(input) ? input : [])
        .filter((ep: any) => typeof ep === "number" && ep > 0)
        .map((ep: number) => Math.floor(ep))
    )
  ).sort((a, b) => a - b);
}

function sanitizeLibrary(input: any): UserLibrary {
  if (Array.isArray(input)) {
    const importedMovies = dedupeLibraryItems(input);
    const watched: LibraryItem[] = [];
    const watchlist: LibraryItem[] = [];
    const ratings: Record<string, number> = {};

    input.forEach((raw, index) => {
      const normalized = importedMovies[index] || dedupeLibraryItems([raw])[0];
      if (!normalized) return;
      const listType = raw?.listType === "watched" ? "watched" : raw?.listType === "favorites" ? "watched" : "watchlist";
      if (listType === "watched") watched.push(normalized);
      else watchlist.push(normalized);
      if (typeof raw?.userRating === "number") ratings[keyFor(normalized)] = raw.userRating;
      else if (typeof raw?.rating === "number") ratings[keyFor(normalized)] = raw.rating;
      else if (typeof raw?.imdbRating === "number") ratings[keyFor(normalized)] = raw.imdbRating;
    });

    return {
      watchlist: dedupeLibraryItems(watchlist),
      watched: dedupeLibraryItems(watched),
      ratings,
      watching: {},
      notes: {},
    };
  }

  const rawWatchlist = Array.isArray(input?.watchlist)
    ? input.watchlist
    : Array.isArray(input?.movies?.watchlist)
      ? input.movies.watchlist
      : Array.isArray(input?.movieWatchlist)
        ? input.movieWatchlist
        : Array.isArray(input?.list)
          ? input.list
          : [];

  const rawWatched = Array.isArray(input?.watched)
    ? input.watched
    : Array.isArray(input?.movies?.watched)
      ? input.movies.watched
      : Array.isArray(input?.movieWatched)
        ? input.movieWatched
        : [];

  const rawSeriesWatchlist = Array.isArray(input?.seriesWatchlist)
    ? input.seriesWatchlist
    : Array.isArray(input?.tvWatchlist)
      ? input.tvWatchlist
      : [];

  const rawSeriesWatched = Array.isArray(input?.seriesWatched)
    ? input.seriesWatched
    : Array.isArray(input?.tvWatched)
      ? input.tvWatched
      : [];

  const watchlist = dedupeLibraryItems([...rawWatchlist, ...rawSeriesWatchlist]);
  const watched = dedupeLibraryItems([...rawWatched, ...rawSeriesWatched]);

  const ratingsSource = input?.ratings && typeof input.ratings === "object"
    ? input.ratings
    : input?.movieRatings && typeof input.movieRatings === "object"
      ? input.movieRatings
      : input?.userRatings && typeof input.userRatings === "object"
        ? input.userRatings
        : {};

  const validKeys = new Set([...watchlist, ...watched].map((item) => keyFor(item)));
  const ratings: Record<string, number> = Object.fromEntries(
    Object.entries(ratingsSource)
      .map(([key, value]) => [key, typeof value === "string" ? Number(value) : value] as const)
      .filter(([key, value]) => validKeys.has(key) && typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 10)
  ) as Record<string, number>;

  const watchingSource = input?.watching && typeof input.watching === "object"
    ? input.watching
    : input?.seriesProgress && typeof input.seriesProgress === "object"
      ? input.seriesProgress
      : input?.tvProgress && typeof input.tvProgress === "object"
        ? input.tvProgress
        : {};

  const watching: WatchingProgress = {};
  Object.entries(watchingSource).forEach(([showId, value]) => {
    const numericId = Number(showId);
    const safeShowId = Number.isNaN(numericId) ? buildSyntheticLibraryId({ title: showId, mediaType: "tv" }) : numericId;
    const season = typeof (value as any)?.season === "number" && (value as any).season > 0 ? Math.floor((value as any).season) : 1;

    const watchedEpisodesBySeasonSource = (value as any)?.watchedEpisodesBySeason;
    const watchedEpisodesBySeason: Record<string, number[]> = {};

    if (watchedEpisodesBySeasonSource && typeof watchedEpisodesBySeasonSource === "object") {
      Object.entries(watchedEpisodesBySeasonSource).forEach(([seasonKey, episodes]) => {
        watchedEpisodesBySeason[String(seasonKey)] = normalizeEpisodeNumbers(episodes);
      });
    } else {
      const legacyEpisodes = Array.isArray((value as any)?.watchedEpisodes)
        ? (value as any).watchedEpisodes
        : Array.isArray((value as any)?.episodes)
          ? (value as any).episodes
          : [];
      watchedEpisodesBySeason[String(season)] = normalizeEpisodeNumbers(legacyEpisodes);
    }

    const selectedEpisodeBySeasonSource = (value as any)?.selectedEpisodeBySeason;
    const selectedEpisodeBySeason: Record<string, number> = {};

    if (selectedEpisodeBySeasonSource && typeof selectedEpisodeBySeasonSource === "object") {
      Object.entries(selectedEpisodeBySeasonSource).forEach(([seasonKey, ep]) => {
        const safeEpisode = typeof ep === "number" && ep > 0 ? Math.floor(ep) : 1;
        selectedEpisodeBySeason[String(seasonKey)] = safeEpisode;
      });
    } else {
      const legacySelectedEpisode = typeof (value as any)?.selectedEpisode === "number" && (value as any).selectedEpisode > 0
        ? Math.floor((value as any).selectedEpisode)
        : watchedEpisodesBySeason[String(season)]?.[0] || 1;
      selectedEpisodeBySeason[String(season)] = legacySelectedEpisode;
    }

    const episodeFilter = (value as any)?.episodeFilter === "watched" || (value as any)?.episodeFilter === "unwatched" ? (value as any).episodeFilter : "all";

    watching[String(safeShowId)] = { season, episodeFilter, selectedEpisodeBySeason, watchedEpisodesBySeason };
  });

  const notes: Record<string, string> = {};
  if (input?.notes && typeof input.notes === "object") {
    Object.entries(input.notes).forEach(([k, v]) => { if (typeof v === "string") notes[k] = v; });
  }

  return { watchlist, watched, ratings, watching, notes };
}

function loadLibrary(): UserLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    if (!raw) return defaultLibrary;
    const parsed = JSON.parse(raw);
    if (parsed?.library) return sanitizeLibrary(parsed.library);
    return sanitizeLibrary(parsed);
  } catch {
    return defaultLibrary;
  }
}

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return null;
}

function normalizeAuthErrorMessage(error: any): string {
  const raw = String(error?.message || "Authentication failed.");
  const lower = raw.toLowerCase();
  if (lower.includes("weak_password") || lower.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and symbol.";
  }
  if (lower.includes("pwned") || lower.includes("leaked") || lower.includes("compromised")) {
    return "That password appears in breach data. Use a unique password you have never used elsewhere.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  return raw;
}
function profileStorageKey(email: string) {
  return `${PROFILE_STORAGE_KEY}:${email.toLowerCase()}`;
}

function buildDefaultProfile(email: string, username?: string): UserProfile {
  const now = new Date().toISOString();
  const fallbackUsername = username || email.split("@")[0] || "Member";
  return {
    username: fallbackUsername,
    avatarUrl: null,
    memberSince: now,
    lastLogin: now,
  };
}

function loadUserProfile(email: string): UserProfile {
  try {
    const raw = localStorage.getItem(profileStorageKey(email));
    if (!raw) return buildDefaultProfile(email);
    const parsed = JSON.parse(raw);
    return {
      username: parsed?.username || buildDefaultProfile(email).username,
      avatarUrl: parsed?.avatarUrl || null,
      memberSince: parsed?.memberSince || new Date().toISOString(),
      lastLogin: parsed?.lastLogin || new Date().toISOString(),
    };
  } catch {
    return buildDefaultProfile(email);
  }
}

function saveUserProfile(email: string, profile: UserProfile) {
  localStorage.setItem(profileStorageKey(email), JSON.stringify(profile));
}

function formatProfileDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function getLibraryUpdatedAt(): number {
  try {
    const raw = localStorage.getItem(LIBRARY_META_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.updatedAt === "number" ? parsed.updatedAt : 0;
  } catch {
    return 0;
  }
}

function setLibraryUpdatedAt(timestamp = Date.now()) {
  localStorage.setItem(LIBRARY_META_KEY, JSON.stringify({ updatedAt: timestamp }));
}

function libraryScore(library: UserLibrary): number {
  return (
    library.watchlist.length * 2 +
    library.watched.length * 2 +
    Object.keys(library.ratings).length +
    Object.keys(library.watching).length * 3
  );
}

function mergeLibraries(primary: UserLibrary, secondary: UserLibrary): UserLibrary {
  const watchlist = dedupeLibraryItems([...primary.watchlist, ...secondary.watchlist]);
  const watched = dedupeLibraryItems([...primary.watched, ...secondary.watched]);
  const ratings = { ...secondary.ratings, ...primary.ratings };
  const watching: WatchingProgress = { ...secondary.watching, ...primary.watching };
  const notes = { ...secondary.notes, ...primary.notes };
  return { watchlist, watched, ratings, watching, notes };
}

function isMissingCloudTableError(error: unknown): boolean {
  const err = error as SupabaseRuntimeError | null;
  if (!err) return false;
  return err.code === "PGRST205" || Boolean(err.message?.includes("goodfilm_libraries"));
}

async function uploadLibraryToCloud(user: CloudUser, library: UserLibrary) {
  if (user.provider !== "supabase" || !supabase || cloudTableUnavailable) return;
  const { error } = await supabase.from("goodfilm_libraries").upsert({
    user_id: user.id,
    email: user.email,
    library,
    updated_at: new Date().toISOString(),
  });
  if (!error) return;
  if (isMissingCloudTableError(error)) {
    cloudTableUnavailable = true;
    return;
  }
  throw error;
}

async function downloadLibraryFromCloud(user: CloudUser): Promise<CloudLibraryRow | null> {
  if (user.provider !== "supabase" || !supabase || cloudTableUnavailable) return null;
  const { data, error } = await supabase
    .from("goodfilm_libraries")
    .select("library, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingCloudTableError(error)) {
      cloudTableUnavailable = true;
      return null;
    }
    throw error;
  }
  if (!data?.library) return null;
  return { library: sanitizeLibrary(data.library), updated_at: data.updated_at };
}

function AuthModal({
  open,
  mode,
  setMode,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess: (user: CloudUser, mode: AuthMode, profile?: UserProfile) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail(""); setPassword(""); setConfirmPassword(""); setUsername("");
      setMessage(null); setLoading(false); setShowPass(false); setShowConfirm(false);
    }
  }, [open]);

  // Enter key submits
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !loading) handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, email, password, confirmPassword, username, loading]);

  const handleSubmit = async () => {
    if (!email.trim()) { setMessage("Enter a valid email address."); return; }
    if (mode === "signup") {
      if (!username.trim() || username.trim().length < 3) { setMessage("Choose a username with at least 3 characters."); return; }
      if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
      const passwordError = validatePasswordStrength(password);
      if (passwordError) { setMessage(passwordError); return; }
    } else {
      if (password.length < 6) { setMessage("Enter your password."); return; }
    }
    setLoading(true);
    setMessage(null);
    try {
      if (!supabase) { setMessage("Supabase authentication is not configured."); return; }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user?.id && data.user.email) {
          const profile = buildDefaultProfile(data.user.email, username.trim());
          saveUserProfile(data.user.email, profile);
          onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode, profile);
          onClose();
        } else {
          setMessage("Check your email to confirm your account.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user?.id && data.user.email) {
          const profile = loadUserProfile(data.user.email);
          const nextProfile = { ...profile, lastLogin: new Date().toISOString() };
          saveUserProfile(data.user.email, nextProfile);
          onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode, nextProfile);
          onClose();
        }
      }
    } catch (err: any) {
      setMessage(normalizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  const inputClass = "flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-3.5 focus-within:border-[#efb43f]/50 focus-within:bg-white/[0.09] transition";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0f1117] shadow-[0_32px_80px_rgba(0,0,0,0.65)]"
          >
            {/* Header */}
            <div className="relative overflow-hidden px-8 pb-6 pt-8">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,180,63,0.08),transparent_60%)]" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efb43f]/15">
                      {isLogin ? <LogIn size={18} className="text-[#efb43f]" /> : <User size={18} className="text-[#efb43f]" />}
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#efb43f]/70">GoodFilm</span>
                  </div>
                  <div className="text-[28px] font-bold tracking-[-0.04em] text-white">{isLogin ? "Welcome back" : "Create account"}</div>
                  <div className="mt-1 text-[14px] text-white/45">{isLogin ? "Sign in to sync your list across devices" : "Join GoodFilm and start tracking"}</div>
                </div>
                <button onClick={onClose} className="rounded-full p-2 text-white/40 transition hover:bg-white/8 hover:text-white/80">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              <div className="space-y-4">
                {!isLogin && (
                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-white/60">Username</div>
                    <div className={inputClass}>
                      <User size={16} className="shrink-0 text-white/30" />
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        autoComplete="username"
                        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-white/60">Email</div>
                  <div className={inputClass}>
                    <Mail size={16} className="shrink-0 text-white/30" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      autoComplete="email"
                      className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-white/60">Password</div>
                  <div className={inputClass}>
                    <Lock size={16} className="shrink-0 text-white/30" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? "Your password" : "Choose a strong password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="shrink-0 text-white/30 transition hover:text-white/60">
                      {showPass ? <Eye size={16} /> : <Eye size={16} className="opacity-50" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-white/60">Confirm Password</div>
                    <div className={inputClass}>
                      <Lock size={16} className="shrink-0 text-white/30" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="shrink-0 text-white/30 transition hover:text-white/60">
                        {showConfirm ? <Eye size={16} /> : <Eye size={16} className="opacity-50" />}
                      </button>
                    </div>
                  </div>
                )}

                {message && (
                  <div className="flex items-center gap-2 rounded-[12px] bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-400">
                    <X size={14} className="shrink-0" /> {message}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-2 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#efb43f] text-[15px] font-bold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                      <RefreshCw size={18} />
                    </motion.div>
                  ) : isLogin ? <LogIn size={18} /> : <User size={18} />}
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </button>

                <div className="text-center pt-1">
                  <span className="text-[13px] text-white/40">{isLogin ? "No account yet? " : "Already have one? "}</span>
                  <button
                    onClick={() => { setMode(isLogin ? "signup" : "login"); setMessage(null); }}
                    className="text-[13px] font-semibold text-[#efb43f] hover:underline"
                  >
                    {isLogin ? "Create account" : "Sign in instead"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


function ProfileModal({
  open,
  onClose,
  currentUser,
  profile,
  onUpdateProfile,
  onLogout,
  library,
}: {
  open: boolean;
  onClose: () => void;
  currentUser: CloudUser | null;
  profile: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
  library: UserLibrary;
}) {
  const [activeSection, setActiveSection] = useState<"overview" | "account" | "stats">("overview");
  const [editing, setEditing] = useState<null | "username" | "password">(null);
  const [username, setUsername] = useState(profile?.username || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (open) {
      setUsername(profile?.username || "");
      setActiveSection("overview");
    } else {
      setPassword(""); setConfirmPassword(""); setEditing(null); setMessage(null);
      setShowPass(false); setShowConfirm(false);
    }
  }, [open, profile?.username]);

  if (!open || !currentUser || !profile) return null;

  const initials = (profile.username || currentUser.email || "U").slice(0, 1).toUpperCase();

  // Stats computed from library
  const totalWatchlist = library.watchlist.length;
  const totalWatched = library.watched.length;
  const moviesWatched = library.watched.filter(i => i.mediaType === "movie").length;
  const tvWatched = library.watched.filter(i => i.mediaType === "tv").length;
  const moviesWatchlist = library.watchlist.filter(i => i.mediaType === "movie").length;
  const tvWatchlist = library.watchlist.filter(i => i.mediaType === "tv").length;
  const ratings = Object.values(library.ratings || {});
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length / 2).toFixed(1) : null;
  const totalRated = ratings.length;

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage(text); setMessageType(type);
    setTimeout(() => setMessage(null), 3500);
  };

  const saveUsername = () => {
    if (!username.trim() || username.trim().length < 3) { showMsg("Username must be at least 3 characters.", "error"); return; }
    onUpdateProfile({ username: username.trim() });
    setEditing(null);
    showMsg("Username updated successfully.");
  };

  const savePassword = async () => {
    const error = validatePasswordStrength(password);
    if (error) { showMsg(error, "error"); return; }
    if (password !== confirmPassword) { showMsg("Passwords do not match.", "error"); return; }
    if (currentUser.provider === "supabase" && supabase) {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { showMsg(normalizeAuthErrorMessage(updateError), "error"); return; }
    }
    setPassword(""); setConfirmPassword(""); setEditing(null);
    showMsg("Password changed successfully.");
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: User },
    { key: "stats", label: "My Stats", icon: Star },
    { key: "account", label: "Account", icon: Settings },
  ] as const;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[72] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[760px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0c12] shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
        >
          {/* Hero header */}
          <div className="relative overflow-hidden px-8 pt-8 pb-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(239,180,63,0.10),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.07),transparent_55%)]" />

            <button onClick={onClose} className="absolute right-5 top-5 z-10 rounded-full bg-white/8 p-2 text-white/50 transition hover:bg-white/14 hover:text-white">
              <X size={18} />
            </button>

            <div className="relative flex items-center gap-5 pb-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#efb43f] to-[#d4840a] text-[32px] font-bold text-black shadow-[0_8px_24px_rgba(239,180,63,0.35)]">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0a0c12]">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              </div>

              {/* Name & email */}
              <div className="flex-1 min-w-0">
                <div className="text-[26px] font-bold tracking-[-0.03em] text-white truncate">{profile.username}</div>
                <div className="text-[13px] text-white/45 truncate">{currentUser.email}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                  <Cloud size={10} /> Cloud sync active
                </div>
              </div>

              {/* Quick stats row */}
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-[22px] font-bold text-white">{totalWatched}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">Watched</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[22px] font-bold text-white">{totalWatchlist}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">Watchlist</div>
                </div>
                {avgRating && <>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-[22px] font-bold text-[#efb43f]">{avgRating}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Avg Rating</div>
                  </div>
                </>}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-t border-white/6 pt-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as any)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-[13px] font-semibold transition rounded-t-xl",
                    activeSection === key ? "text-white" : "text-white/40 hover:text-white/70"
                  )}
                >
                  <Icon size={14} />
                  {label}
                  {activeSection === key && (
                    <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#efb43f]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="px-8 py-6">

            {/* Toast message */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className={cn(
                    "mb-5 flex items-center gap-2.5 rounded-[14px] border px-4 py-3 text-[13px] font-medium",
                    messageType === "success"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/25 bg-red-500/10 text-red-400"
                  )}
                >
                  {messageType === "success" ? <Check size={15} /> : <X size={15} />}
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── OVERVIEW TAB ── */}
            {activeSection === "overview" && (
              <div className="space-y-4">
                {/* Member info cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Watched", value: totalWatched, icon: Eye, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Watchlist", value: totalWatchlist, icon: Bookmark, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Rated", value: totalRated, icon: Star, color: "text-[#efb43f]", bg: "bg-[#efb43f]/10" },
                    { label: "Member", value: formatProfileDate(profile.memberSince).split(" ")[0], icon: User, color: "text-purple-400", bg: "bg-purple-500/10" },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-[18px] border border-white/6 bg-white/[0.03] p-4">
                      <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full", bg)}>
                        <Icon size={15} className={color} />
                      </div>
                      <div className="text-[20px] font-bold text-white">{value}</div>
                      <div className="text-[11px] text-white/40">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Joined + last login */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] border border-white/6 bg-white/[0.03] px-4 py-3.5">
                    <div className="text-[11px] text-white/40 mb-1">Member Since</div>
                    <div className="text-[15px] font-semibold text-white">{formatProfileDate(profile.memberSince)}</div>
                  </div>
                  <div className="rounded-[16px] border border-white/6 bg-white/[0.03] px-4 py-3.5">
                    <div className="text-[11px] text-white/40 mb-1">Last Login</div>
                    <div className="text-[15px] font-semibold text-white">{formatProfileDate(profile.lastLogin)}</div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-4">
                  <div className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setActiveSection("account")} className="flex items-center gap-2.5 rounded-[13px] bg-white/[0.04] border border-white/8 px-4 py-3 text-[13px] font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white">
                      <Settings size={15} className="text-white/50" /> Edit Profile
                    </button>
                    <button onClick={() => setActiveSection("stats")} className="flex items-center gap-2.5 rounded-[13px] bg-white/[0.04] border border-white/8 px-4 py-3 text-[13px] font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white">
                      <Star size={15} className="text-white/50" /> View Stats
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STATS TAB ── */}
            {activeSection === "stats" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Watched breakdown */}
                  <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye size={16} className="text-emerald-400" />
                      <span className="text-[13px] font-semibold text-white/70">Watched</span>
                    </div>
                    <div className="text-[36px] font-bold text-white leading-none mb-3">{totalWatched}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/45">Movies</span>
                        <span className="font-semibold text-white">{moviesWatched}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: totalWatched ? `${(moviesWatched/totalWatched)*100}%` : "0%" }} />
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/45">TV Shows</span>
                        <span className="font-semibold text-white">{tvWatched}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: totalWatched ? `${(tvWatched/totalWatched)*100}%` : "0%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Watchlist breakdown */}
                  <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Bookmark size={16} className="text-blue-400" />
                      <span className="text-[13px] font-semibold text-white/70">Watchlist</span>
                    </div>
                    <div className="text-[36px] font-bold text-white leading-none mb-3">{totalWatchlist}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/45">Movies</span>
                        <span className="font-semibold text-white">{moviesWatchlist}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-[#efb43f]" style={{ width: totalWatchlist ? `${(moviesWatchlist/totalWatchlist)*100}%` : "0%" }} />
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/45">TV Shows</span>
                        <span className="font-semibold text-white">{tvWatchlist}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: totalWatchlist ? `${(tvWatchlist/totalWatchlist)*100}%` : "0%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ratings */}
                {totalRated > 0 && (
                  <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-[#efb43f]" />
                        <span className="text-[13px] font-semibold text-white/70">Ratings</span>
                      </div>
                      <div className="text-[13px] text-white/50">{totalRated} rated</div>
                    </div>
                    <div className="flex items-end gap-4">
                      <div>
                        <div className="text-[42px] font-bold text-[#efb43f] leading-none">{avgRating}</div>
                        <div className="text-[12px] text-white/40 mt-1">avg out of 5</div>
                      </div>
                      <div className="flex-1 space-y-1.5 pb-1">
                        {[5,4,3,2,1].map(star => {
                          const count = ratings.filter(r => Math.round(r/2) === star).length;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-[11px] text-white/40 w-3">{star}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                                <div className="h-full rounded-full bg-[#efb43f]" style={{ width: totalRated ? `${(count/totalRated)*100}%` : "0%" }} />
                              </div>
                              <span className="text-[11px] text-white/40 w-4 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {totalRated === 0 && (
                  <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-6 text-center">
                    <Star size={28} className="text-white/20 mx-auto mb-2" />
                    <div className="text-[14px] text-white/40">No ratings yet — rate movies and shows to see your stats here</div>
                  </div>
                )}
              </div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeSection === "account" && (
              <div className="space-y-3">

                {/* Change username */}
                <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[14px] font-semibold text-white">Username</div>
                      <div className="text-[12px] text-white/40 mt-0.5">Current: <span className="text-white/70">{profile.username}</span></div>
                    </div>
                    {editing !== "username" && (
                      <button onClick={() => setEditing("username")} className="rounded-[11px] bg-white/[0.06] border border-white/8 px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:bg-white/[0.1] hover:text-white">
                        Edit
                      </button>
                    )}
                  </div>
                  {editing === "username" && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3 rounded-[13px] border border-white/10 bg-white/[0.05] px-4 py-3 focus-within:border-[#efb43f]/40">
                        <User size={15} className="text-white/30" />
                        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="New username" className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/25" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="rounded-[11px] border border-white/10 px-4 py-2 text-[13px] font-semibold text-white/50 transition hover:text-white/80">Cancel</button>
                        <button onClick={saveUsername} className="rounded-[11px] bg-[#efb43f] px-5 py-2 text-[13px] font-bold text-black transition hover:brightness-110">Save</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change password */}
                <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[14px] font-semibold text-white">Password</div>
                      <div className="text-[12px] text-white/40 mt-0.5">Update your account password</div>
                    </div>
                    {editing !== "password" && (
                      <button onClick={() => setEditing("password")} className="rounded-[11px] bg-white/[0.06] border border-white/8 px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:bg-white/[0.1] hover:text-white">
                        Change
                      </button>
                    )}
                  </div>
                  {editing === "password" && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3 rounded-[13px] border border-white/10 bg-white/[0.05] px-4 py-3 focus-within:border-[#efb43f]/40">
                        <Lock size={15} className="text-white/30" />
                        <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/25" />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="text-white/30 hover:text-white/60"><Eye size={14} /></button>
                      </div>
                      <div className="flex items-center gap-3 rounded-[13px] border border-white/10 bg-white/[0.05] px-4 py-3 focus-within:border-[#efb43f]/40">
                        <Lock size={15} className="text-white/30" />
                        <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/25" />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-white/30 hover:text-white/60"><Eye size={14} /></button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(null)} className="rounded-[11px] border border-white/10 px-4 py-2 text-[13px] font-semibold text-white/50 transition hover:text-white/80">Cancel</button>
                        <button onClick={savePassword} className="rounded-[11px] bg-[#efb43f] px-5 py-2 text-[13px] font-bold text-black transition hover:brightness-110">Save</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Danger zone */}
                <div className="rounded-[18px] border border-red-500/15 bg-red-500/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-semibold text-red-400">Sign Out</div>
                      <div className="text-[12px] text-white/35 mt-0.5">You can sign back in anytime</div>
                    </div>
                    <button onClick={onLogout} className="rounded-[11px] bg-red-500/15 border border-red-500/25 px-5 py-2 text-[13px] font-semibold text-red-400 transition hover:bg-red-500/25">
                      Sign Out
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


// ── Server config ────────────────────────────────────────────────────────────
type ServerKey = "111movies" | "vidking" | "vidlinkpro" | "vidfastpro" | "videasy" | "vidsrcxyz";
type ServerConfig = {
  key: ServerKey;
  label: string;
  buildUrl: (args: { type: MediaType; tmdbId: number | string; season?: number; episode?: number }) => string;
};
const SERVERS: ServerConfig[] = [
  {
    key: "111movies",
    label: "111movies — Default",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://111movies.net/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://111movies.net/movie/${tmdbId}?autoplay=1`,
  },
  {
    key: "vidking",
    label: "VidKing",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://www.vidking.net/embed/movie/${tmdbId}`,
  },
  {
    key: "vidlinkpro",
    label: "Vidlink Pro",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
        : `https://vidlink.pro/movie/${tmdbId}`,
  },
  {
    key: "vidfastpro",
    label: "VidFast Pro",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidfast.net/tv/${tmdbId}/${season}/${episode}`
        : `https://vidfast.net/movie/${tmdbId}`,
  },
  {
    key: "videasy",
    label: "Videasy",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
        : `https://player.videasy.net/movie/${tmdbId}`,
  },
  {
    key: "vidsrcxyz",
    label: "Vidsrc XYZ",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.xyz/embed/movie/${tmdbId}`,
  },
];

// ── Watch Providers (Where to Watch) ─────────────────────────────────────────
type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};
type WatchProvidersResult = {
  results?: Record<string, {
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
    free?: WatchProvider[];
  }>;
};

async function fetchWatchProviders(mediaType: MediaType, tmdbId: number): Promise<WatchProvidersResult | null> {
  try {
    return await tmdbFetch<WatchProvidersResult>(`/${mediaType}/${tmdbId}/watch/providers`);
  } catch {
    return null;
  }
}

async function fetchAiRecommendations(title: string, mediaType: MediaType, genres: string, overview: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Based on the ${mediaType === "tv" ? "TV show" : "movie"} "${title}" (genres: ${genres}, overview: ${overview.slice(0, 200)}), suggest exactly 5 similar ${mediaType === "tv" ? "TV shows" : "movies"} the viewer would enjoy. Reply ONLY with a JSON array of 5 title strings, no extra text. Example: ["Title One","Title Two","Title Three","Title Four","Title Five"]`,
        }],
      }),
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ── Person Modal (Actor/Director detail) ─────────────────────────────────────
type PersonDetail = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  profile_path?: string | null;
  known_for_department?: string;
};
type PersonCredit = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  character?: string;
  job?: string;
  media_type?: string;
};

function PersonModal({
  open,
  personId,
  onClose,
  onOpenItem,
}: {
  open: boolean;
  personId: number | null;
  onClose: () => void;
  onOpenItem: (item: MediaItem, mediaType: MediaType) => void;
}) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [credits, setCredits] = useState<PersonCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    if (!open || !personId) return;
    setShowFullBio(false);
    setPerson(null);
    setCredits([]);
    setLoading(true);
    Promise.all([
      tmdbFetch<PersonDetail>(`/person/${personId}`),
      tmdbFetch<{ cast: PersonCredit[]; crew: PersonCredit[] }>(`/person/${personId}/combined_credits`),
    ]).then(([p, c]) => {
      setPerson(p);
      const combined = [...(c.cast || []), ...(c.crew || [])]
        .filter(x => x.poster_path && (x.media_type === "movie" || x.media_type === "tv"))
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      const seen = new Set<number>();
      setCredits(combined.filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true; }).slice(0, 24));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, personId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bio = person?.biography || "";
  const shortBio = bio.length > 320 ? bio.slice(0, 320) + "…" : bio;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[860px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0c12] shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
        >
          {loading || !person ? (
            <div className="flex h-64 items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={28} className="text-white/30" />
              </motion.div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="relative overflow-hidden p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(239,180,63,0.08),transparent_55%)]" />
                <button onClick={onClose} className="absolute right-5 top-5 rounded-full bg-white/8 p-2 text-white/40 transition hover:bg-white/14 hover:text-white">
                  <X size={18} />
                </button>
                <div className="relative flex gap-5">
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[16px] bg-white/8">
                    {person.profile_path
                      ? <img src={`${POSTER_BASE}${person.profile_path}`} alt={person.name} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-white/20"><User size={32} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[28px] font-bold tracking-[-0.03em] text-white">{person.name}</div>
                    <div className="mt-1 text-[13px] text-white/45">{person.known_for_department || "Actor"}</div>
                    {person.birthday && <div className="mt-1 text-[12px] text-white/35">Born {person.birthday}{person.place_of_birth ? ` · ${person.place_of_birth}` : ""}</div>}
                    {bio && (
                      <div className="mt-3">
                        <p className="text-[13px] leading-6 text-white/60">{showFullBio ? bio : shortBio}</p>
                        {bio.length > 320 && (
                          <button onClick={() => setShowFullBio(v => !v)} className="mt-1 text-[12px] font-semibold text-[#efb43f] hover:underline">
                            {showFullBio ? "Show less" : "Read more"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Known for */}
              {credits.length > 0 && (
                <div className="border-t border-white/6 px-6 py-5">
                  <div className="mb-4 text-[16px] font-bold text-white">Known For</div>
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                    {credits.map((credit) => (
                      <button
                        key={`${credit.id}-${credit.character || credit.job}`}
                        onClick={() => {
                          const mediaType: MediaType = credit.media_type === "tv" ? "tv" : "movie";
                          onOpenItem({ ...credit, media_type: mediaType } as unknown as MediaItem, mediaType);
                          onClose();
                        }}
                        className="group text-left"
                      >
                        <div className="aspect-[2/3] overflow-hidden rounded-[10px] bg-white/8">
                          {credit.poster_path
                            ? <img src={`${POSTER_BASE}${credit.poster_path}`} alt={credit.title || credit.name || ""} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                            : <div className="flex h-full w-full items-center justify-center"><Film size={20} className="text-white/20" /></div>}
                        </div>
                        <div className="mt-1.5 truncate text-[11px] text-white/60">{credit.title || credit.name}</div>
                        {credit.vote_average ? <div className="text-[10px] text-[#efb43f]">★ {credit.vote_average.toFixed(1)}</div> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


function WatchModal({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: {
    url: string;
    title: string;
    mediaType: MediaType;
    tmdbId?: number;
    season?: number;
    episode?: number;
  } | null;
  onClose: () => void;
}) {
  const [selectedServer, setSelectedServer] = useState<ServerKey>("111movies");
  const [showPanel, setShowPanel] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "auto";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setSelectedServer("111movies");
    setShowPanel(true);
    setDropdownOpen(false);
  }, [open, payload?.title, payload?.season, payload?.episode]);

  const activeServer = useMemo(
    () => SERVERS.find((s) => s.key === selectedServer) ?? SERVERS[0],
    [selectedServer]
  );

  const playerUrl = useMemo(() => {
    if (!payload?.tmdbId) return null;
    return activeServer.buildUrl({
      type: payload.mediaType,
      tmdbId: payload.tmdbId,
      season: payload.season,
      episode: payload.episode,
    });
  }, [activeServer, payload]);

  if (!open || !payload || !playerUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black"
      >
        <div className="relative h-screen w-screen overflow-hidden">

          {/* Back button — top left, always above iframe */}
          <button
            onClick={onClose}
            className="absolute left-6 top-6 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-white/14 bg-black/50 px-4 text-[14px] font-medium text-white backdrop-blur-md transition hover:bg-black/70"
          >
            <ChevronLeft size={15} /> Back
          </button>

          {/* Server panel — floating center top */}
          {showPanel && (
            <div className="absolute left-1/2 top-6 z-30 w-[92%] max-w-xl -translate-x-1/2 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">Playback issues? Try another server.</p>
                <button
                  onClick={() => setShowPanel(false)}
                  className="rounded-full bg-white/10 px-4 py-1 text-[12px] text-white hover:bg-white/20"
                >
                  Hide
                </button>
              </div>

              {/* Custom dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-full border border-white/15 bg-white/10 px-5 py-3 text-left text-white transition hover:bg-white/15"
                >
                  <span className="text-[14px] font-medium">{activeServer.label}</span>
                  <ChevronRight size={16} className={cn("opacity-70 transition-transform", dropdownOpen ? "rotate-90" : "")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
                    {SERVERS.map((server) => (
                      <button
                        key={server.key}
                        onClick={() => { setSelectedServer(server.key); setDropdownOpen(false); }}
                        className={cn(
                          "block w-full px-5 py-3 text-left text-[13px] transition hover:bg-white/10",
                          server.key === selectedServer ? "bg-white/10 font-semibold text-white" : "text-white/80"
                        )}
                      >
                        {server.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-[11px] text-white/50">
                Server quality and playback progress can vary by provider.
              </p>
            </div>
          )}

          {/* Show servers button when panel is hidden */}
          {!showPanel && (
            <button
              onClick={() => setShowPanel(true)}
              className="absolute right-6 top-6 z-30 rounded-full bg-black/50 px-4 py-2 text-[13px] text-white backdrop-blur-md transition hover:bg-black/70"
            >
              Servers
            </button>
          )}

          {/* iframe — full screen */}
          <iframe
            key={playerUrl}
            src={playerUrl}
            title={payload.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0 bg-black"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="min-h-screen bg-[#07080d] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(239,180,63,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_50%,rgba(14,30,65,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_80%,rgba(14,30,65,0.18),transparent_60%)]" />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '256px' }} />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function SettingsPanel({
  open,
  onClose,
  onImport,
  onExport,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  cloudMode,
  anchorTop = 88,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  currentUser: CloudUser | null;
  onOpenAuth: (mode: AuthMode) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  cloudMode: CloudMode;
  anchorTop?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const cloudColor = cloudMode === "ready" ? "text-emerald-400" : cloudMode === "missing_table" ? "text-amber-400" : "text-white/30";
  const cloudLabel = cloudMode === "ready" ? "Cloud sync active" : cloudMode === "missing_table" ? "Cloud table missing" : currentUser ? "Checking sync..." : "Not syncing";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-4 w-[310px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1117] shadow-[0_24px_60px_rgba(0,0,0,0.55)] md:right-6"
            style={{ top: `${anchorTop ?? 88}px` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="text-[16px] font-bold text-white">Settings</div>
              <button onClick={onClose} className="rounded-full p-1.5 text-white/35 transition hover:bg-white/8 hover:text-white/70">
                <X size={16} />
              </button>
            </div>

            {/* Account section */}
            <div className="px-3 pt-3 pb-2">
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Account</div>

              {currentUser ? (
                <div className="space-y-0.5">
                  {/* User info pill */}
                  <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] border border-white/6 px-3.5 py-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efb43f]/15 text-[14px] font-bold text-[#efb43f]">
                      {(currentUser.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{currentUser.email}</div>
                      <div className={cn("flex items-center gap-1.5 text-[11px] mt-0.5", cloudColor)}>
                        <Cloud size={11} />
                        <span>{cloudLabel}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { onOpenProfile(); onClose(); }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <User size={16} className="text-cyan-400" /> Profile & Settings
                  </button>
                  <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <LogOut size={16} className="text-rose-400" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 mb-1">
                  <button
                    onClick={() => { onOpenAuth("login"); onClose(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-[#efb43f] h-11 text-[14px] font-bold text-black transition hover:brightness-110"
                  >
                    <LogIn size={16} /> Sign In
                  </button>
                  <button
                    onClick={() => { onOpenAuth("signup"); onClose(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/[0.04] h-11 text-[14px] font-semibold text-white/80 transition hover:bg-white/[0.08]"
                  >
                    <User size={16} /> Create Account
                  </button>
                  <div className="flex items-center gap-2 px-1 pt-1 text-[12px] text-white/30">
                    <Cloud size={12} />
                    <span>Sign in to enable cloud sync</span>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-white/6" />

            {/* Data section */}
            <div className="px-3 py-3">
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Data</div>

              {cloudMode === "missing_table" && (
                <div className="mb-2 rounded-[12px] border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
                  <div className="text-[12px] text-amber-400 font-medium mb-1.5">Cloud table missing</div>
                  <div className="text-[11px] text-white/45 mb-2">Run setup SQL in Supabase SQL Editor, then reload.</div>
                  <button
                    onClick={() => navigator.clipboard.writeText(CLOUD_SETUP_SQL)}
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Copy setup SQL
                  </button>
                </div>
              )}

              <label className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white">
                <Upload size={16} className="text-emerald-400" />
                <span>Import Library</span>
                <span className="ml-auto text-[10px] font-semibold text-white/25">JSON</span>
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { onImport(file); onClose(); }
                  e.target.value = "";
                }} />
              </label>

              <button
                onClick={() => { onExport(); onClose(); }}
                className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Download size={16} className="text-blue-400" />
                <span>Export Library</span>
                <span className="ml-auto text-[10px] font-semibold text-white/25">SAVE</span>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-white/6" />

            {/* Help */}
            <div className="px-3 py-3">
              <button
                onClick={() => window.alert("Help is not configured yet.")}
                className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
              >
                <HelpCircle size={16} className="text-pink-400" />
                <span>Help & Support</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


function TopPillNav({
  activeTab,
  setActiveTab,
  search,
  setSearch,
  onOpenProfile,
  appLanguage,
  searchResults,
  searchLoading,
  searchError,
  onOpenResult,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  search: string;
  setSearch: (value: string) => void;
  onOpenProfile: (anchorTop?: number) => void;
  appLanguage: AppLanguage;
  searchResults: MediaItem[];
  searchLoading: boolean;
  searchError: string | null;
  onOpenResult: (item: MediaItem, mediaType: MediaType) => void;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<"all" | "movie" | "tv" | "anime">("all");

  const filteredSearchResults = useMemo(() => {
    if (searchFilter === "all") return searchResults;
    if (searchFilter === "movie") return searchResults.filter((result) => (result.media_type || (result.first_air_date ? "tv" : "movie")) === "movie");
    if (searchFilter === "tv") return searchResults.filter((result) => (result.media_type || (result.first_air_date ? "tv" : "movie")) === "tv");
    return searchResults.filter((result) => {
      const type = result.media_type || (result.first_air_date ? "tv" : "movie");
      const genres = result.genre_ids || [];
      const isAnimation = genres.includes(16);
      const hasJapaneseSignals = /anime|japan|japanese/i.test(`${result.title || ""} ${result.name || ""} ${result.overview || ""}`);
      return isAnimation || (type === "tv" && hasJapaneseSignals);
    });
  }, [searchResults, searchFilter]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [] as Array<{ label: string; item: MediaItem; type: MediaType }>;

    return searchResults
      .map((result) => {
        const label = getTitle(result);
        const lower = label.toLowerCase();
        const type: MediaType = result.media_type || (result.first_air_date ? "tv" : "movie");
        let score = 0;

        if (lower === q) score += 120;
        if (lower.startsWith(q)) score += 80;
        if (lower.includes(q)) score += 45;
        if (lower.split(" ").some((word) => word.startsWith(q))) score += 20;
        score += Math.max(0, 20 - Math.abs(lower.length - q.length));
        score += Math.round(result.vote_average || 0);

        return { label, item: result, type, score };
      })
      .sort((a, b) => b.score - a.score)
      .filter((entry, index, arr) => arr.findIndex((x) => x.label.toLowerCase() === entry.label.toLowerCase() && x.type === entry.type) === index)
      .slice(0, 6);
  }, [search, searchResults]);

  const items = [
    { key: "home" as Tab, label: tr(appLanguage, "home"), icon: Home },
    { key: "movies" as Tab, label: tr(appLanguage, "movies"), icon: Film },
    { key: "series" as Tab, label: tr(appLanguage, "tvShows"), icon: Tv },
  ];

  return (
    <>
      {/* ── Cinematic top nav — Sherlock style ── */}
      <header className="sticky top-0 z-40 w-full bg-[#07080d]/90 backdrop-blur-xl" style={{ isolation: "isolate" }}>
        {/* Bottom border line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />

        <div className="relative flex items-center justify-between px-6 py-5 md:px-10 lg:px-14">

          {/* ── LEFT: Logo ── */}
          <motion.button
            whileHover={{ opacity: 0.85 }}
            onClick={() => { setActiveTab("home"); setIsSearchOpen(false); setSearch(""); }}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f]">
              <Film size={14} className="text-black" />
            </div>
            <span className="text-[17px] font-black tracking-[-0.04em] text-white">GoodFilm</span>
          </motion.button>

          {/* ── CENTER: Nav links ── */}
          <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
            {[
              ...items,
              { key: "mylist" as Tab, label: tr(appLanguage, "myList"), icon: List },
            ].map((item) => {
              const Icon = item.icon;
              const active = item.key === activeTab;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setIsSearchOpen(false); setSearch(""); }}
                  whileTap={{ scale: 0.97 }}
                  className="relative px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors"
                >
                  <span className={cn(
                    "transition-colors duration-200",
                    active ? "text-white" : "text-white/45 hover:text-white/80"
                  )}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#efb43f]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* ── RIGHT: Search + User ── */}
          <div className="flex items-center gap-4 shrink-0">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => { setSearchFilter("all"); setIsSearchOpen(true); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:text-white"
              aria-label="Search"
            >
              <Search size={15} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => {
                const navEl = (e.currentTarget as HTMLElement).closest('header');
                const anchorTop = navEl ? navEl.getBoundingClientRect().bottom + 4 : 70;
                onOpenProfile(anchorTop);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-[#efb43f]/40 hover:text-[#efb43f]"
              aria-label="Profile"
            >
              <User size={15} />
            </motion.button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isSearchOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={() => {
              setIsSearchOpen(false);
              setSearch("");
              setSearchFilter("all");
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="mx-auto mt-20 w-[calc(100vw-32px)] max-w-[680px] overflow-hidden rounded-[20px] border border-white/8 bg-[#0a0c12]/98 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
                <Search size={18} className="text-white/52" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr(appLanguage, "search")}
                  className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/32"
                />
                <button
                  onClick={() => {
                    setSearch("");
                    setIsSearchOpen(false);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              {searchSuggestions.length ? (
                <div className="border-b border-white/8 px-5 py-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/36">
                    Suggestions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.map((entry) => (
                      <button
                        key={`${entry.type}-${entry.item.id}`}
                        onClick={() => setSearch(entry.label)}
                        className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/74 transition hover:bg-white/[0.1] hover:text-white"
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="border-b border-white/8 px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "movie", label: "Movies" },
                    { key: "tv", label: "Series" },
                    { key: "anime", label: "Anime" },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSearchFilter(filter.key as "all" | "movie" | "tv" | "anime")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        searchFilter === filter.key ? "bg-[#efb43f] text-black font-bold" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                {!search.trim() ? (
                  <div className="text-sm text-white/48">
                    Start typing to search movies and TV shows.
                  </div>
                ) : searchLoading ? (
                  <div className="text-sm text-white/48">
                    Searching...
                  </div>
                ) : searchError ? (
                  <div className="text-sm text-red-300">
                    {searchError}
                  </div>
                ) : filteredSearchResults.length ? (
                  <div className="space-y-3">
                    {filteredSearchResults.slice(0, 12).map((result) => {
                      const type: MediaType = result.media_type || (result.first_air_date ? "tv" : "movie");

                      return (
                        <button
                          key={`${type}-${result.id}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearch("");
                            setActiveTab(type === "movie" ? "movies" : "series");
                            onOpenResult(result, type);
                          }}
                          className="flex w-full items-center gap-4 rounded-2xl bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                        >
                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-[#151515]">
                            {result.backdrop_path || result.poster_path ? (
                              <img
                                src={`${BACKDROP_BASE}${result.backdrop_path || result.poster_path}`}
                                alt={getTitle(result)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/34">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {getTitle(result)}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                              {type === "movie" ? "Movie" : "Series"} • {getYear(result)}
                            </div>
                            {result.overview ? (
                              <div className="mt-1 line-clamp-2 text-xs text-white/42">
                                {result.overview}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/48">
                    No results found.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Hero({
  items,
  fallbackItem,
  onOpen,
  onToggleWatchlist,
}: {
  items: MediaItem[];
  fallbackItem?: MediaItem | null;
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
}) {
  const sourceItems = items.length ? items : fallbackItem ? [fallbackItem] : [];
  const [heroIndex, setHeroIndex] = useState(0);
  const [logoData, setLogoData] = useState<{ path: string | null; width: number; height: number }>({ path: null, width: 0, height: 0 });
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setHeroIndex(0); }, [sourceItems.length, sourceItems[0]?.id]);

  useEffect(() => {
    if (sourceItems.length <= 1) return;
    const timer = window.setInterval(() => setHeroIndex((p) => (p + 1) % sourceItems.length), 9000);
    return () => window.clearInterval(timer);
  }, [sourceItems.length]);

  useEffect(() => {
    const item = sourceItems[heroIndex];
    if (!item) return;
    setLogoData({ path: null, width: 0, height: 0 });
    const mt: MediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    fetchTMDBLogoPath(mt, item.id).then(setLogoData).catch(() => {});
  }, [heroIndex, sourceItems.length]);

  useEffect(() => {
    const item = sourceItems[heroIndex];
    if (!item) return;
    setTrailerKey(null);
    const mt: MediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    tmdbFetch<{ results: VideoResult[] }>(`/${mt}/${item.id}/videos`)
      .then(res => {
        const vids = res.results || [];
        const t = vids.find(v => v.site === "YouTube" && v.type === "Trailer")
          || vids.find(v => v.site === "YouTube" && v.type === "Teaser")
          || vids.find(v => v.site === "YouTube");
        setTrailerKey(t?.key || null);
      }).catch(() => {});
  }, [heroIndex, sourceItems.length]);

  // Scroll strip horizontally only
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const child = strip.children[heroIndex] as HTMLElement | undefined;
    if (!child) return;
    const sr = strip.getBoundingClientRect();
    const cr = child.getBoundingClientRect();
    strip.scrollBy({ left: cr.left - sr.left - sr.width / 2 + cr.width / 2, behavior: "smooth" });
  }, [heroIndex]);

  const item = sourceItems[heroIndex] || fallbackItem || null;
  if (!item) return <div className="h-[560px] bg-[#07080d]" />;

  const mediaType: MediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
  const backdrop = item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : "";
  const poster = item.poster_path ? `${POSTER_BASE}${item.poster_path}` : "";
  const GENRES: Record<number, string> = { 28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",53:"Thriller",10752:"War",37:"Western",10759:"Action & Adventure",10765:"Sci-Fi & Fantasy" };
  const genreText = (item.genre_ids || []).slice(0, 3).map(id => GENRES[id]).filter(Boolean).join(", ");
  const year = getYear(item);
  const rating = item.vote_average || 0;
  const ratingStars = Math.round(rating / 2);
  const runtime = (item as any).runtime;

  return (
    <section
      className="relative w-full overflow-hidden bg-[#07080d]"
      style={{ height: "calc(100svh - 68px)", minHeight: "540px", maxHeight: "800px" }}
    >
      {/* ── Full bleed background image ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${heroIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {backdrop || poster ? (
            <img
              src={backdrop || poster}
              alt=""
              className="h-full w-full object-cover object-center pointer-events-none"
            />
          ) : (
            <div className="h-full w-full bg-[#0a0b12]" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Gradient overlays — left heavy, bottom fade ── */}
      {/* Strong left gradient keeps text readable */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(7,8,13,0.97)_0%,rgba(7,8,13,0.9)_25%,rgba(7,8,13,0.65)_48%,rgba(7,8,13,0.15)_72%,rgba(7,8,13,0)_100%)]" />
      {/* Top fade for nav readability */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[rgba(7,8,13,0.55)] to-transparent" />
      {/* Bottom fade into content */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#07080d] via-[rgba(7,8,13,0.8)] to-transparent" />

      {/* ── LEFT: Content block — vertically centered ── */}
      <div className="relative z-10 flex h-full flex-col justify-center pb-40 pl-8 md:pl-14 lg:pl-20" style={{ maxWidth: "520px" }}>
        <motion.div
          key={`content-${heroIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo image or big title text */}
          {logoData.path ? (
            <motion.img
              key={`logo-${heroIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              src={`${BACKDROP_BASE}${logoData.path}`}
              alt={getTitle(item)}
              className="mb-4 max-h-[100px] max-w-[400px] object-contain object-left drop-shadow-[0_4px_28px_rgba(0,0,0,0.9)]"
            />
          ) : (
            <motion.h1
              key={`title-${heroIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 text-[52px] font-black leading-[0.88] tracking-[-0.04em] text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.7)] md:text-[64px]"
            >
              {getTitle(item)}
            </motion.h1>
          )}

          {/* Rating stars + meta row — like Netflix image */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
            {/* Star rating */}
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={13} className={i <= ratingStars ? "fill-[#e63946] text-[#e63946]" : "fill-white/20 text-white/20"} />
              ))}
            </div>
            {year && <span className="text-white/60">{year}</span>}
            {genreText && <span className="text-white/55">{genreText}</span>}
            {runtime ? <span className="text-white/55">{Math.floor(runtime/60)}h {runtime%60}min</span> : null}
          </div>

          {/* Overview */}
          <p className="mb-7 text-[13px] leading-[1.85] text-white/55 md:text-[14px]">
            {((item.overview || "").slice(0, 180))}{(item.overview||"").length > 180 ? "…" : ""}
          </p>

          {/* CTA buttons — Play red + My List dark gray */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onOpen(item, mediaType)}
              className="inline-flex h-12 items-center gap-2.5 rounded-[6px] bg-[#e63946] pl-6 pr-7 text-[15px] font-bold text-white shadow-[0_4px_24px_rgba(230,57,70,0.5)] transition hover:brightness-110"
            >
              <Play size={15} className="fill-white" /> Play
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onToggleWatchlist(item, mediaType)}
              className="inline-flex h-12 items-center gap-2.5 rounded-[6px] bg-[rgba(51,51,51,0.85)] px-7 text-[15px] font-semibold text-white backdrop-blur-sm transition hover:bg-[rgba(70,70,70,0.9)]"
            >
              + My List
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM-RIGHT: Poster carousel — landscape cards like reference image ── */}
      <div className="absolute bottom-0 right-0 z-10 left-0 md:left-auto">
        <div className="flex flex-col items-end">
          {/* Poster strip — bottom right, landscape orientation */}
          <div
            ref={stripRef}
            className="flex items-end gap-3 overflow-x-auto px-4 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8 lg:px-10"
          >
            {sourceItems.map((entry, index) => {
              const active = index === heroIndex;
              const ep = entry.poster_path ? `${POSTER_BASE}${entry.poster_path}` : (entry.backdrop_path ? `${BACKDROP_BASE}${entry.backdrop_path}` : "");
              return (
                <motion.button
                  key={entry.id}
                  onClick={() => setHeroIndex(index)}
                  whileHover={{ y: -4, scale: 1.04 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "relative shrink-0 overflow-hidden transition-all duration-300",
                    active
                      ? "h-[100px] w-[72px] rounded-[6px] ring-2 ring-white ring-offset-[2px] ring-offset-[#07080d] brightness-110 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                      : "h-[88px] w-[64px] rounded-[6px] opacity-50 grayscale hover:opacity-80 hover:grayscale-0"
                  )}
                >
                  {ep ? (
                    <img src={ep} alt={getTitle(entry)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a]">
                      <Film size={14} className="text-white/20" />
                    </div>
                  )}
                  {/* Active title label */}
                  {active && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 pb-1 pt-4">
                      <div className="line-clamp-1 text-[7px] font-bold text-white/90">{getTitle(entry)}</div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Red circular arrow controls — bottom right, like Netflix reference */}
          {sourceItems.length > 1 && (
            <div className="flex items-center gap-2 px-4 pb-4 md:px-8 lg:px-10">
              <button
                onClick={() => setHeroIndex(p => (p - 1 + sourceItems.length) % sourceItems.length)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e63946] text-white shadow-[0_4px_16px_rgba(230,57,70,0.4)] transition hover:brightness-110"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setHeroIndex(p => (p + 1) % sourceItems.length)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e63946] text-white shadow-[0_4px_16px_rgba(230,57,70,0.4)] transition hover:brightness-110"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}



function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="h-5 w-[3px] rounded-full bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
      <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">{title}</h2>
    </div>
  );
}

function PosterCard({
  item,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  inWatchlist,
  inWatched,
  size = "default",
}: {
  item: MediaItem | LibraryItem;
  mediaType: MediaType;
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  inWatchlist: boolean;
  inWatched: boolean;
  userRating?: number;
  size?: "default" | "large" | "grid";
}) {
  const title = "mediaType" in item ? item.title : getTitle(item);
  const posterPath = "mediaType" in item ? item.posterPath : item.poster_path;
  const backdropPath = "mediaType" in item ? item.backdropPath : item.backdrop_path;
  const cardImage = backdropPath || posterPath;
  const year = "mediaType" in item ? item.year : getYear(item);
  const rating = "rating" in item ? item.rating : item.vote_average;
  const [logoData, setLogoData] = useState<{ path: string | null; width: number; height: number }>({ path: null, width: 0, height: 0 });
  const [glowColor, setGlowColor] = useState<string>("rgba(239,180,63,0.0)");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLogoData({ path: null, width: 0, height: 0 });
    fetchTMDBLogoPath(mediaType, item.id).then((data) => { if (!cancelled) setLogoData(data); });
    return () => { cancelled = true; };
  }, [mediaType, item.id]);

  // Extract color from poster for glow effect
  useEffect(() => {
    const imgSrc = posterPath || backdropPath;
    if (!imgSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${POSTER_BASE}${imgSrc}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 4, 4);
        const d = ctx.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        if (n) setGlowColor(`rgba(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)},0.55)`);
      } catch {}
    };
  }, [posterPath, backdropPath]);

  const sizeClasses =
    size === "large"
      ? "w-[300px] min-w-[300px] lg:w-[320px] lg:min-w-[320px]"
      : size === "grid"
        ? "w-full min-w-0"
        : "w-[220px] min-w-[220px] lg:w-[240px] lg:min-w-[240px]";

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative cursor-pointer", sizeClasses)}
    >
      {/* Color glow shadow under card — extracted from poster */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 -z-10 rounded-[22px] blur-xl"
        style={{ background: glowColor }}
      />

      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[14px] bg-[#0d0f14] shadow-[0_8px_28px_rgba(0,0,0,0.5)]">
          {/* Image */}
          {cardImage ? (
            <img
              src={`${(backdropPath || !posterPath) ? BACKDROP_BASE : POSTER_BASE}${cardImage}`}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.07]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0d0f14]">
              <Film size={24} className="text-white/10" />
            </div>
          )}

          {/* Cinematic dark gradient */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_35%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.92)_100%)]" />

          {/* Hover border glow */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset"
            style={{ boxShadow: `inset 0 0 0 1px ${glowColor}` }}
          />

          {/* Rating badge — top left */}
          {rating && Number(rating) > 0 && (
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-sm bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
              <Star size={9} className="fill-[#efb43f] text-[#efb43f]" />
              <span className="text-[10px] font-bold text-white">{Number(rating).toFixed(1)}</span>
            </div>
          )}

          {/* Status dot — top right */}
          <div className="absolute right-2.5 top-2.5 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
              className={cn(
                "pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition",
                inWatchlist ? "bg-[#efb43f] shadow-[0_2px_10px_rgba(239,180,63,0.5)]" : "bg-black/60 hover:bg-[#efb43f]"
              )}
            >
              <Bookmark size={11} className={inWatchlist ? "fill-black text-black" : "text-white"} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
              className={cn(
                "pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition",
                inWatched ? "bg-white shadow-[0_2px_10px_rgba(255,255,255,0.3)]" : "bg-black/60 hover:bg-white"
              )}
            >
              <Eye size={11} className={inWatched ? "fill-black text-black" : "text-white"} />
            </motion.button>
          </div>

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            {logoData.path ? (
              <img
                src={`${BACKDROP_BASE}${logoData.path}`}
                alt={title}
                className="max-h-[36px] max-w-[60%] object-contain object-left drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
              />
            ) : (
              <div className="line-clamp-1 text-[13px] font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{title}</div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45">
              <span className="font-semibold uppercase tracking-widest">{mediaType === "movie" ? "Film" : "Series"}</span>
              {year && <><span className="text-white/20">·</span><span>{year}</span></>}
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function Rail({
  title,
  items,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  largeCards = false,
}: {
  title: string;
  items: MediaItem[];
  mediaType?: MediaType;
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  largeCards?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    ref.current?.scrollBy({
      left: direction === "left" ? (largeCards ? -340 : -280) : largeCards ? 340 : 280,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
        <h3 className="text-[16px] font-bold uppercase tracking-[0.06em] text-white">{title}</h3>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/8 bg-[#07080d]/95 p-2 text-white/40 shadow-xl backdrop-blur-sm transition hover:border-[#efb43f]/40 hover:text-[#efb43f]"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/8 bg-[#07080d]/95 p-2 text-white/40 shadow-xl backdrop-blur-sm transition hover:border-[#efb43f]/40 hover:text-[#efb43f]"
        >
          <ChevronRight size={14} />
        </button>

        <div
          ref={ref}
          className={cn(
            "flex overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            largeCards ? "gap-4" : "gap-3"
          )}
        >
          {items.map((item) => {
            const type = mediaType || item.media_type || (item.first_air_date ? "tv" : "movie");
            const k = keyFor({ id: item.id, mediaType: type });
            return (
              <PosterCard
                key={k}
                item={item}
                mediaType={type}
                onOpen={() => onOpen(item, type)}
                onToggleWatchlist={() => onToggleWatchlist(item, type)}
                onToggleWatched={() => onToggleWatched(item, type)}
                inWatchlist={watchlistKeys.has(k)}
                inWatched={watchedKeys.has(k)}
                userRating={ratings[k]}
                size={largeCards ? "large" : "default"}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

type StreamingRowItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  image: string | null;
  subtitle?: string;
  badge?: string;
  progress?: number;
  meta?: string;
  sourceItem?: MediaItem | LibraryItem;
};

function StreamingMediaCard({
  item,
  onOpen,
}: {
  item: StreamingRowItem;
  onOpen: (item: StreamingRowItem) => void;
}) {
  const [glowColor, setGlowColor] = useState("rgba(239,180,63,0.0)");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!item.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${BACKDROP_BASE}${item.image}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 4, 4);
        const d = ctx.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        if (n) setGlowColor(`rgba(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)},0.5)`);
      } catch {}
    };
  }, [item.image]);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative w-[260px] min-w-[260px] md:w-[300px] md:min-w-[300px] lg:w-[340px] lg:min-w-[340px]"
    >
      {/* Color glow */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 -z-10 rounded-[20px] blur-xl"
        style={{ background: glowColor }}
      />
      <motion.button
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => onOpen(item)}
        className="group relative w-full overflow-hidden rounded-[14px] bg-[#0d0f14] text-left shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {item.image ? (
            <img
              src={`${BACKDROP_BASE}${item.image}`}
              alt={item.title}
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.07]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0d0f14]">
              <Film size={24} className="text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_35%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.92)_100%)]" />

          {/* Badge */}
          {item.badge && (
            <div className="absolute left-2.5 top-2.5">
              <span className="rounded-sm bg-[#efb43f] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">{item.badge}</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <div className="line-clamp-2 text-[17px] font-bold leading-tight tracking-[-0.03em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] lg:text-[19px]">
              {item.title}
            </div>
            {item.meta ? <div className="mt-1 text-[11px] text-white/50">{item.meta}</div> : null}
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

function ContinueWatchingCard({
  item,
  onOpen,
  onRemove,
}: {
  item: StreamingRowItem;
  onOpen: (item: StreamingRowItem) => void;
  onRemove: (item: StreamingRowItem) => void;
}) {
  const progress = Math.max(0, Math.min(100, item.progress || 0));
  const [glowColor, setGlowColor] = useState("rgba(239,180,63,0.0)");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!item.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${BACKDROP_BASE}${item.image}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 4, 4);
        const d = ctx.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        if (n) setGlowColor(`rgba(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)},0.5)`);
      } catch {}
    };
  }, [item.image]);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative w-[260px] min-w-[260px] md:w-[300px] md:min-w-[300px] lg:w-[340px] lg:min-w-[340px]"
    >
      {/* Color glow */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 -z-10 rounded-[20px] blur-xl"
        style={{ background: glowColor }}
      />
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="group relative w-full overflow-hidden rounded-[14px] bg-[#0d0f14] shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
      >
        <button onClick={() => onOpen(item)} className="block w-full text-left">
          <div className="relative aspect-[16/9] overflow-hidden">
            {item.image ? (
              <img
                src={`${BACKDROP_BASE}${item.image}`}
                alt={item.title}
                className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.07]"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#0d0f14]">
                <Film size={24} className="text-white/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.7)_70%,rgba(0,0,0,0.95)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <div className="line-clamp-1 text-[15px] font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {item.title}
              </div>
              {item.subtitle ? <div className="mt-0.5 text-[11px] text-white/50">{item.subtitle}</div> : null}
              {/* Gold progress bar */}
              <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#efb43f] to-[#f5ca6e]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {item.meta ? <div className="mt-1.5 text-[10px] text-white/40">{item.meta}</div> : null}
            </div>
          </div>
        </button>

        <button
          onClick={() => onRemove(item)}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/50 backdrop-blur-md transition hover:bg-black/75 hover:text-white"
          aria-label="Remove"
        >
          <X size={11} />
        </button>
      </motion.div>
    </motion.div>
  );
}

function ContentRow({
  title,
  items,
  onOpen,
  variant = "default",
  onRemoveContinue,
}: {
  title: string;
  items: StreamingRowItem[];
  onOpen: (item: StreamingRowItem) => void;
  variant?: "default" | "continue";
  onRemoveContinue?: (item: StreamingRowItem) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    ref.current?.scrollBy({ left: direction === "left" ? -340 : 340, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="mb-14">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
        <h3 className="text-[16px] font-bold uppercase tracking-[0.06em] text-white">{title}</h3>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-[#0f1117]/90 p-2.5 text-white/60 shadow-lg backdrop-blur-sm transition hover:border-[#efb43f]/30 hover:text-[#efb43f]"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-[#0f1117]/90 p-2.5 text-white/60 shadow-lg backdrop-blur-sm transition hover:border-[#efb43f]/30 hover:text-[#efb43f]"
        >
          <ChevronRight size={16} />
        </button>

        <div ref={ref} className="flex gap-5 overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((rowItem) =>
            variant === "continue" ? (
              <ContinueWatchingCard
                key={`${rowItem.mediaType}-${rowItem.id}`}
                item={rowItem}
                onOpen={onOpen}
                onRemove={onRemoveContinue || (() => {})}
              />
            ) : (
              <StreamingMediaCard
                key={`${rowItem.mediaType}-${rowItem.id}`}
                item={rowItem}
                onOpen={onOpen}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
function Grid({
  items,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  size = "default",
}: {
  items: Array<MediaItem | LibraryItem>;
  mediaType?: MediaType;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  size?: "default" | "large" | "grid";
}) {
  return (
    <div className={cn(
      "grid gap-y-6",
      size === "large"
        ? "grid-cols-1 gap-x-[18px] sm:grid-cols-2 xl:grid-cols-3"
        : "grid-cols-1 gap-x-[18px] sm:grid-cols-2 xl:grid-cols-3"
    )}>
      {items.map((item) => {
        const type = mediaType || ("mediaType" in item ? item.mediaType : item.media_type || (item.first_air_date ? "tv" : "movie"));
        const k = keyFor({ id: item.id, mediaType: type });
        return (
          <PosterCard
            key={k}
            item={item as MediaItem & LibraryItem}
            mediaType={type}
            onOpen={() => onOpen(item, type)}
            onToggleWatchlist={() => onToggleWatchlist(item, type)}
            onToggleWatched={() => onToggleWatched(item, type)}
            inWatchlist={watchlistKeys.has(k)}
            inWatched={watchedKeys.has(k)}
            userRating={ratings[k]}
            size={size === "large" ? "large" : "grid"}
          />
        );
      })}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-white/6 bg-white/[0.02] px-8 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#efb43f]/10 border border-[#efb43f]/15">
        <Film size={22} className="text-[#efb43f]/60" />
      </div>
      <div className="text-[17px] font-bold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-white/40">{body}</p>
    </div>
  );
}
function InlineRatingControl({ value, onChange }: { value?: number; onChange: (rating: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const committedValue = typeof value === "number" ? value : 0; // stored as /10
  const previewValue = hoverValue ?? committedValue;
  const committedStars = committedValue / 2;
  const previewStars = previewValue / 2;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
        setHoverValue(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
        setHoverValue(null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange(Math.min(10, committedValue + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange(Math.max(0, committedValue - 1));
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onChange(0);
        setHoverValue(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, committedValue, onChange]);

  const commitRating = (nextValue: number) => {
    onChange(committedValue === nextValue ? 0 : nextValue);
    setHoverValue(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setHoverValue(null)}
      className={cn(
        "inline-flex h-14 items-center overflow-hidden rounded-full border border-white/18 bg-white/8 text-white backdrop-blur transition-all duration-200 ease-out",
        open ? "w-[332px] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]" : "w-[146px] px-4"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 shrink-0"
        aria-label="Toggle rating control"
      >
        <Star size={18} className={cn("transition", committedValue > 0 ? "fill-[#efb43f] text-[#efb43f]" : "text-white/85")} />
        <span className="min-w-[76px] text-[13px] font-semibold text-white/82">{previewStars.toFixed(1)}/5</span>
      </button>

      <div
        className={cn(
          "ml-3 flex items-center gap-1 transition-all duration-200 ease-out",
          open ? "opacity-100 translate-x-0" : "w-0 translate-x-2 overflow-hidden opacity-0"
        )}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const fullActive = previewStars >= star;
          const halfActive = !fullActive && previewStars >= star - 0.5;
          const targetHalf = (star - 0.5) * 2; // stored as /10
          const targetFull = star * 2;

          return (
            <div key={star} className="relative flex h-8 w-8 items-center justify-center">
              <button
                type="button"
                title={`${(targetHalf / 2).toFixed(1)}/5`}
                aria-label={`Rate ${(targetHalf / 2).toFixed(1)} out of 5`}
                onMouseEnter={() => setHoverValue(targetHalf)}
                onFocus={() => setHoverValue(targetHalf)}
                onClick={() => commitRating(targetHalf)}
                className="absolute left-0 top-0 z-10 h-full w-1/2"
              />
              <button
                type="button"
                title={`${(targetFull / 2).toFixed(1)}/5`}
                aria-label={`Rate ${(targetFull / 2).toFixed(1)} out of 5`}
                onMouseEnter={() => setHoverValue(targetFull)}
                onFocus={() => setHoverValue(targetFull)}
                onClick={() => commitRating(targetFull)}
                className="absolute right-0 top-0 z-10 h-full w-1/2"
              />
              <Star size={18} className="text-white/24 transition duration-150" />
              {(fullActive || halfActive) ? (
                <div
                  className="pointer-events-none absolute left-0 top-0 flex h-full items-center overflow-hidden transition-all duration-150"
                  style={{ width: fullActive ? "100%" : "50%" }}
                >
                  <Star size={18} className="fill-[#efb43f] text-[#efb43f] drop-shadow-[0_0_8px_rgba(239,180,63,0.35)]" />
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="ml-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/55">
          {hoverValue !== null ? `Preview ${(hoverValue / 2).toFixed(1)}/5` : committedValue > 0 ? `Saved ${committedStars.toFixed(1)}/5` : "Unset"}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(0);
            setHoverValue(null);
          }}
          className="ml-1 rounded-full border border-white/10 px-2 py-1 text-[10px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
function SegmentTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string; count?: number }>;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              active ? "bg-[#efb43f] text-black" : "text-white/65 hover:text-white"
            )}
          >
            {option.label}{typeof option.count === "number" ? ` (${option.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

function MyListView({
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onExport,
  onImport,
  onNavigateTab,
  onBulkLinkTMDB,
  bulkLinking,
  appLanguage,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNavigateTab: (tab: Tab) => void;
  onBulkLinkTMDB: () => void;
  bulkLinking: boolean;
  appLanguage: AppLanguage;
}) {
  const watchlistMovies = useMemo(() => library.watchlist.filter((item) => item.mediaType === "movie"), [library.watchlist]);
  const watchlistSeries = useMemo(() => library.watchlist.filter((item) => item.mediaType === "tv"), [library.watchlist]);
  const watchedMovies = useMemo(() => library.watched.filter((item) => item.mediaType === "movie"), [library.watched]);
  const watchedSeries = useMemo(() => library.watched.filter((item) => item.mediaType === "tv"), [library.watched]);
  const [randomPick, setRandomPick] = useState<LibraryItem | null>(null);
  const [pickSource, setPickSource] = useState<"watchlist" | "watched">("watchlist");

  const pickRandom = () => {
    const pool = pickSource === "watchlist" ? library.watchlist : library.watched;
    if (!pool.length) return;
    const item = pool[Math.floor(Math.random() * pool.length)];
    setRandomPick(item);
  };

  return (
    <div className="pt-6">

      {/* ── Random Picker ─────────────────────────────────── */}
      {(library.watchlist.length > 0 || library.watched.length > 0) && (
        <div className="mb-8 overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efb43f]/15">
                <Play size={16} className="text-[#efb43f]" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-white">What to Watch Tonight?</div>
                <div className="text-[12px] text-white/40">Can't decide? Let us pick for you.</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                {(["watchlist", "watched"] as const).map((src) => (
                  <button key={src} onClick={() => { setPickSource(src); setRandomPick(null); }}
                    className={cn("rounded-full px-3 py-1.5 text-[12px] font-semibold transition", pickSource === src ? "bg-[#efb43f] text-black" : "text-white/50 hover:text-white")}>
                    {src === "watchlist" ? "Watchlist" : "Watched"}
                  </button>
                ))}
              </div>
              <button onClick={pickRandom}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#efb43f] px-4 text-[13px] font-bold text-black transition hover:brightness-110">
                <RefreshCw size={13} /> Shuffle
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {randomPick ? (
              <motion.div key={randomPick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-4 px-5 py-4">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-[10px] bg-white/8">
                  {randomPick.posterPath
                    ? <img src={`${POSTER_BASE}${randomPick.posterPath}`} alt={randomPick.title} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center"><Film size={18} className="text-white/20" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-bold text-white truncate">{randomPick.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-white/45">
                    <span className="rounded-full bg-white/8 px-2 py-0.5">{randomPick.mediaType === "tv" ? "TV Show" : "Movie"}</span>
                    {randomPick.year && <span>{randomPick.year}</span>}
                    {randomPick.rating && <span className="text-[#efb43f]">★ {randomPick.rating.toFixed(1)}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { onOpen(randomPick, randomPick.mediaType); setRandomPick(null); }}
                    className="rounded-[11px] bg-white px-4 py-2 text-[13px] font-bold text-black transition hover:brightness-90">
                    Open
                  </button>
                  <button onClick={pickRandom} className="rounded-[11px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/60 transition hover:text-white">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 text-[13px] text-white/30">
                Hit Shuffle to get a random pick from your {pickSource === "watchlist" ? "watchlist" : "watched"} list.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{tr(appLanguage, "myList")}</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={onBulkLinkTMDB} disabled={bulkLinking} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw size={14} className={bulkLinking ? "animate-spin" : ""} /> {bulkLinking ? tr(appLanguage, "linking") : tr(appLanguage, "bulkLinkTMDB")}
          </button>
          <button onClick={onExport} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#efb43f] px-4 text-sm font-semibold text-black"><Download size={14} /> {tr(appLanguage, "exportMovies")}</button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/16">
            <Upload size={14} /> {tr(appLanguage, "importMovies")}
            <input
              type="file"
              accept=".json,application/json,text/json,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button onClick={() => onNavigateTab("watchlist")} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.05]">
          <div className="text-[12px] uppercase tracking-[0.16em] text-white/40">{tr(appLanguage, "watchlist")}</div>
          <div className="mt-3 text-3xl font-semibold text-white">{library.watchlist.length}</div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/52">
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "movies")} {watchlistMovies.length}</span>
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "tvShows")} {watchlistSeries.length}</span>
          </div>
        </button>

        <button onClick={() => onNavigateTab("watched")} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.05]">
          <div className="text-[12px] uppercase tracking-[0.16em] text-white/40">{tr(appLanguage, "watched")}</div>
          <div className="mt-3 text-3xl font-semibold text-white">{library.watched.length}</div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/52">
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "movies")} {watchedMovies.length}</span>
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "tvShows")} {watchedSeries.length}</span>
          </div>
        </button>
      </div>

      <div className="mt-10 space-y-10">
        {library.watchlist.length ? (
          <Rail
            title={tr(appLanguage, "watchlist")}
            items={library.watchlist as unknown as MediaItem[]}
            onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
            onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
            onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
            watchlistKeys={watchlistKeys}
            watchedKeys={watchedKeys}
            ratings={library.ratings}
            largeCards
          />
        ) : (
          <EmptyState title={`${tr(appLanguage, "watchlist")} empty`} body="Add movies or TV shows from the rails or detail modal." />
        )}

        {library.watched.length ? (
          <Rail
            title={tr(appLanguage, "watched")}
            items={library.watched as unknown as MediaItem[]}
            onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
            onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
            onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
            watchlistKeys={watchlistKeys}
            watchedKeys={watchedKeys}
            ratings={library.ratings}
            largeCards
          />
        ) : (
          <EmptyState title={`${tr(appLanguage, "watched")} empty`} body="Mark titles as watched to fill this section." />
        )}
      </div>
    </div>
  );
}

function WatchlistTabView({
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onBack,
  appLanguage,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onBack: () => void;
  appLanguage: AppLanguage;
}) {
  const [segment, setSegment] = useState<"movies" | "series">("movies");
  const movieItems = useMemo(() => library.watchlist.filter((item) => item.mediaType === "movie"), [library.watchlist]);
  const seriesItems = useMemo(() => library.watchlist.filter((item) => item.mediaType === "tv"), [library.watchlist]);
  const items = segment === "movies" ? movieItems : seriesItems;

  return (
    <div className="pt-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.06] hover:text-white">
            <ChevronLeft size={16} /> {tr(appLanguage, "back")}
          </button>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{tr(appLanguage, "watchlist")}</h2>
        </div>
        <SegmentTabs
          value={segment}
          onChange={(value) => setSegment(value as "movies" | "series")}
          options={[
            { key: "movies", label: `${tr(appLanguage, "movies")} ${tr(appLanguage, "watchlist")}`, count: movieItems.length },
            { key: "series", label: `${tr(appLanguage, "tvShows")} ${tr(appLanguage, "watchlist")}`, count: seriesItems.length },
          ]}
        />
      </div>
      {items.length ? (
        <Grid
          items={items as unknown as MediaItem[]}
          mediaType={segment === "movies" ? "movie" : "tv"}
          onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
          onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
          onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
          watchlistKeys={watchlistKeys}
          watchedKeys={watchedKeys}
          ratings={library.ratings}
          size="large"
        />
      ) : (
        <EmptyState title={`${tr(appLanguage, "watchlist")} empty`} body={segment === "movies" ? `Add ${tr(appLanguage, "movies").toLowerCase()} to your ${tr(appLanguage, "watchlist").toLowerCase()}.` : `Add ${tr(appLanguage, "tvShows").toLowerCase()} to your ${tr(appLanguage, "watchlist").toLowerCase()}.`} />
      )}
    </div>
  );
}

function WatchedTabView({
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onBack,
  appLanguage,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onBack: () => void;
  appLanguage: AppLanguage;
}) {
  const [segment, setSegment] = useState<"movies" | "series">("movies");
  const movieItems = useMemo(() => library.watched.filter((item) => item.mediaType === "movie"), [library.watched]);
  const seriesItems = useMemo(() => library.watched.filter((item) => item.mediaType === "tv"), [library.watched]);
  const items = segment === "movies" ? movieItems : seriesItems;

  return (
    <div className="pt-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.06] hover:text-white">
            <ChevronLeft size={16} /> {tr(appLanguage, "back")}
          </button>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{tr(appLanguage, "watched")}</h2>
        </div>
        <SegmentTabs
          value={segment}
          onChange={(value) => setSegment(value as "movies" | "series")}
          options={[
            { key: "movies", label: `${tr(appLanguage, "movies")} ${tr(appLanguage, "watched")}`, count: movieItems.length },
            { key: "series", label: `${tr(appLanguage, "tvShows")} ${tr(appLanguage, "watched")}`, count: seriesItems.length },
          ]}
        />
      </div>
      {items.length ? (
        <Grid
          items={items as unknown as MediaItem[]}
          mediaType={segment === "movies" ? "movie" : "tv"}
          onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
          onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
          onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
          watchlistKeys={watchlistKeys}
          watchedKeys={watchedKeys}
          ratings={library.ratings}
          size="large"
        />
      ) : (
        <EmptyState title={`${tr(appLanguage, "watched")} empty`} body={segment === "movies" ? `Mark ${tr(appLanguage, "movies").toLowerCase()} as ${tr(appLanguage, "watched").toLowerCase()}.` : `Mark ${tr(appLanguage, "tvShows").toLowerCase()} as ${tr(appLanguage, "watched").toLowerCase()}.`} />
      )}
    </div>
  );
}

function DetailModal({
  open,
  item,
  mediaType,
  onClose,
  inWatchlist,
  inWatched,
  userRating,
  onToggleWatchlist,
  onToggleWatched,
  onRate,
  library,
  setWatchingSeason,
  toggleEpisode,
  setEpisodeFilter,
  setCurrentEpisode,
  continueToNextEpisode,
  markEpisodesUpTo,
  markSeasonComplete,
  clearSeasonEpisodes,
  onResolveLibraryItem,
  onOpenRelated,
  onToggleSimilarWatchlist,
  onToggleSimilarWatched,
  similarWatchlistKeys,
  similarWatchedKeys,
  ratingsMap,
  appLanguage,
  onOpenWatch,
  onSaveNote,
  userNote = "",
}: {
  open: boolean;
  item: MediaItem | LibraryItem | null;
  mediaType: MediaType | null;
  onClose: () => void;
  inWatchlist: boolean;
  inWatched: boolean;
  userRating?: number;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onRate: (rating: number) => void;
  library: UserLibrary;
  setWatchingSeason: (showId: number, season: number) => void;
  toggleEpisode: (showId: number, episode: number) => void;
  setEpisodeFilter: (showId: number, filter: "all" | "watched" | "unwatched") => void;
  setCurrentEpisode: (showId: number, episode: number) => void;
  continueToNextEpisode: (showId: number, season: number, episodeNumbers: number[]) => void;
  markEpisodesUpTo: (showId: number, season: number, episode: number) => void;
  markSeasonComplete: (showId: number, season: number, episodeNumbers: number[]) => void;
  clearSeasonEpisodes: (showId: number, season: number) => void;
  onResolveLibraryItem: (oldItem: LibraryItem, resolved: MediaItem, mediaType: MediaType) => void;
  onOpenRelated: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatched: (item: MediaItem, mediaType: MediaType) => void;
  similarWatchlistKeys: Set<string>;
  similarWatchedKeys: Set<string>;
  ratingsMap: Record<string, number>;
  appLanguage: AppLanguage;
  onOpenWatch: (payload: { url: string; title: string; mediaType: MediaType; tmdbId?: number; season?: number; episode?: number }) => void;
  onSaveNote: (key: string, note: string) => void;
  userNote?: string;
}) {
  const [detail, setDetail] = useState<DetailData | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [imdbData, setImdbData] = useState<IMDbTitleData | null>(null);
  const [omdbData, setOmdbData] = useState<OmdbData | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [watchProviders, setWatchProviders] = useState<{ flatrate?: WatchProvider[]; rent?: WatchProvider[]; free?: WatchProvider[] } | null>(null);
  const [personModalId, setPersonModalId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState(userNote || "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [aiRecs, setAiRecs] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<MediaItem[]>([]);
  const similarSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !item || !mediaType) return;
    // Reset per-item state
    setNoteText(userNote || "");
    setNoteSaved(false);
    setAiRecs([]);
    setWatchProviders(null);
    setTrailerKey(null);

    const progress = library.watching[String(item.id)];
    const nextSeason = progress?.season || 1;
    setSelectedSeason(nextSeason);
    setSelectedEpisode(progress?.selectedEpisodeBySeason?.[String(nextSeason)] || 1);

    let cancelled = false;

    const loadDetails = async () => {
      try {
        const baseId = item.id;
        const [d, videosRes, credits, recs] = await Promise.all([
          tmdbFetch<DetailData>(`/${mediaType}/${baseId}`, { append_to_response: mediaType === "tv" ? "credits,external_ids" : "credits" }),
          tmdbFetch<{ results: VideoResult[] }>(`/${mediaType}/${baseId}/videos`),
          tmdbFetch<{ cast: CastMember[] }>(`/${mediaType}/${baseId}/credits`),
          tmdbFetch<{ results: MediaItem[] }>(`/${mediaType}/${baseId}/recommendations`),
        ]);

        if (cancelled) return;
        setDetail(d);
                setCast(((d.credits?.cast || credits.cast || [])).slice(0, 12));
        setSimilarItems((recs.results || []).slice(0, 18));

        // Extract trailer key from videos
        const videos = videosRes.results || [];
        const trailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer")
          || videos.find(v => v.site === "YouTube" && v.type === "Teaser")
          || videos.find(v => v.site === "YouTube");
        if (!cancelled) setTrailerKey(trailer?.key || null);

        // Fetch watch providers (where to stream)
        const tmdbIdForProviders = d.id || baseId;
        fetchWatchProviders(mediaType, tmdbIdForProviders)
          .then((res) => {
            if (!cancelled && res) {
              const regionData = res.results?.US || res.results?.GB || Object.values(res.results || {})[0] || null;
              setWatchProviders(regionData ? { flatrate: regionData.flatrate, rent: regionData.rent, free: regionData.free } : null);
            }
          }).catch(() => {});

        const imdbId = d.imdb_id || d.external_ids?.imdb_id;
        if (imdbId) {
          const [imdb, omdb] = await Promise.all([
            imdbFetchTitle(imdbId),
            omdbFetch({ i: imdbId, plot: "full" }),
          ]);
          if (!cancelled) { setImdbData(imdb); setOmdbData(omdb); }
        } else if (!cancelled) {
          setImdbData(null);
          setOmdbData(null);
        }

        if (mediaType === "tv") {
          try {
            const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${d.id || baseId}/season/${nextSeason}`);
            if (!cancelled) setEpisodes(seasonData.episodes || []);
          } catch {
            if (!cancelled) setEpisodes([]);
          }
        }
        return;
      } catch {
        if (!("mediaType" in item)) {
          if (!cancelled) {
            setDetail(null);
                        setEpisodes([]);
            setCast([]);
            setImdbData(null);
            setSimilarItems([]);
          }
          return;
        }
      }

      try {
        const match = await searchTMDBMatchForLibraryItem(item as LibraryItem);
        if (!match || cancelled) {
          if (!cancelled) {
            setDetail(null);
                        setEpisodes([]);
            setCast([]);
            setSimilarItems([]);
          }
          return;
        }

        onResolveLibraryItem(item as LibraryItem, match, mediaType);

        const [d, videosRes2, credits, recs] = await Promise.all([
          tmdbFetch<DetailData>(`/${mediaType}/${match.id}`, { append_to_response: mediaType === "tv" ? "credits,external_ids" : "credits" }),
          tmdbFetch<{ results: VideoResult[] }>(`/${mediaType}/${match.id}/videos`),
          tmdbFetch<{ cast: CastMember[] }>(`/${mediaType}/${match.id}/credits`),
          tmdbFetch<{ results: MediaItem[] }>(`/${mediaType}/${match.id}/recommendations`),
        ]);

        if (cancelled) return;
        setDetail(d);
        setCast(((d.credits?.cast || credits.cast || [])).slice(0, 12));
        setSimilarItems((recs.results || []).slice(0, 18));

        // Extract trailer key
        const videos2 = videosRes2.results || [];
        const trailer2 = videos2.find(v => v.site === "YouTube" && v.type === "Trailer")
          || videos2.find(v => v.site === "YouTube" && v.type === "Teaser")
          || videos2.find(v => v.site === "YouTube");
        if (!cancelled) setTrailerKey(trailer2?.key || null);

        const imdbId = d.imdb_id || d.external_ids?.imdb_id;
        if (imdbId) {
          const [imdb, omdb] = await Promise.all([
            imdbFetchTitle(imdbId),
            omdbFetch({ i: imdbId, plot: "full" }),
          ]);
          if (!cancelled) { setImdbData(imdb); setOmdbData(omdb); }
        } else if (!cancelled) {
          setImdbData(null);
          setOmdbData(null);
        }

        if (mediaType === "tv") {
          try {
            const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${match.id}/season/${nextSeason}`);
            if (!cancelled) setEpisodes(seasonData.episodes || []);
          } catch {
            if (!cancelled) setEpisodes([]);
          }
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
                    setEpisodes([]);
          setCast([]);
          setImdbData(null);
          setSimilarItems([]);
        }
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  }, [open, item, mediaType, library.watching, onResolveLibraryItem]);

  const loadSeason = useCallback(async (season: number) => {
    if (!item || mediaType !== "tv") return;
    const resolvedShowId = detail?.id || item.id;
    setSelectedSeason(season);
    setWatchingSeason(item.id, season);
    try {
      const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${resolvedShowId}/season/${season}`);
      const nextEpisodes = seasonData.episodes || [];
      setEpisodes(nextEpisodes);
      const savedEpisode = library.watching[String(item.id)]?.selectedEpisodeBySeason?.[String(season)];
      setSelectedEpisode(savedEpisode || nextEpisodes[0]?.episode_number || 1);
    } catch {
      setEpisodes([]);
      setSelectedEpisode(1);
    }
  }, [item, mediaType, setWatchingSeason, detail?.id, library.watching]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item || !mediaType) return null;

  const display = detail || item;
  const title = "title" in display || "name" in display ? getTitle(display as DetailData) : (display as LibraryItem).title;
  const backdropPath = (detail?.backdrop_path ?? ("backdropPath" in item ? item.backdropPath : item.backdrop_path)) || null;
  const watchedEpisodes = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(selectedSeason)] || [];
  const savedSelectedEpisode = library.watching[String(item.id)]?.selectedEpisodeBySeason?.[String(selectedSeason)] || 1;
  const tmdbScore = ((detail?.vote_average ?? ("rating" in item ? item.rating : 0)) || 0).toFixed(1);
  const imdbScoreValue = extractIMDbRating(imdbData);
  const imdbVotes = extractIMDbVotes(imdbData);
  const omdbImdbRating = omdbData?.imdbRating && omdbData.imdbRating !== "N/A" ? omdbData.imdbRating : null;
  const displayScore = imdbScoreValue ?? (omdbImdbRating ? parseFloat(omdbImdbRating) : Number(tmdbScore));
  const score = displayScore.toFixed(1);
  const rtRating = omdbData?.Ratings?.find(r => r.Source === "Rotten Tomatoes")?.Value ?? null;
  const metacriticScore = omdbData?.Ratings?.find(r => r.Source === "Metacritic")?.Value ?? (omdbData?.Ratings && null);
  const omdbAwards = omdbData?.Awards && omdbData.Awards !== "N/A" ? omdbData.Awards : null;
  const boxOffice = omdbData?.BoxOffice && omdbData.BoxOffice !== "N/A" ? omdbData.BoxOffice : null;
  const omdbWriter = omdbData?.Writer && omdbData.Writer !== "N/A" ? omdbData.Writer : null;
  const genreText = detail?.genres?.map((g) => g.name).join(", ") || (mediaType === "movie" ? "Action, Science Fiction, Thriller" : "Drama, Sci-Fi");
  const releaseDate = detail?.release_date || detail?.first_air_date || "—";
  const runtimeText = detail?.runtime ? `${detail.runtime} minutes` : mediaType === "movie" ? "—" : null;
  const languageText = detail?.original_language ? detail.original_language.toUpperCase() : "—";
  const studioText = detail?.production_companies?.[0]?.name || "Unknown";
  const directorText = detail?.credits?.crew?.find((person) => person.job === "Director")?.name || "Unknown";
  const resolvedTmdbId = detail?.id || (!('mediaType' in item) ? item.id : null);
  const currentEpisodeNumber = selectedEpisode || savedSelectedEpisode || episodes[0]?.episode_number || 1;
  const canWatch = Boolean(resolvedTmdbId);
    const castForDisplay = cast.filter((person) => person.name).slice(0, 12);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="h-screen overflow-y-auto bg-[#05070b]"
        >
          <div className="relative min-h-[420px] overflow-hidden">
            {backdropPath ? (
              <img src={`${BACKDROP_BASE}${backdropPath}`} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[#121822]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.82)_72%,#05070b_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%)]" />

            <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-10 pt-6 lg:px-8">
              <div className="flex items-center justify-between">
                <button onClick={onClose} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/28 text-white backdrop-blur transition hover:bg-black/42">
                  <ChevronLeft size={24} />
                </button>
              </div>

              <div className="pt-20 md:pt-28">
                <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="max-w-[780px] text-[40px] font-bold leading-[0.92] tracking-[-0.05em] text-white md:text-[64px]">
                  {title}
                </motion.h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/72">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#efb43f]/25 bg-[#efb43f]/10 px-3 py-1 font-semibold text-[#efb43f]"><Star size={14} className="fill-[#efb43f]" /> IMDb {score}</span>
                  {rtRating && <span className="inline-flex items-center gap-1 rounded-full border border-[#f97316]/25 bg-[#f97316]/10 px-3 py-1 font-semibold text-[#f97316]">🍅 {rtRating}</span>}
                  {metacriticScore && <span className="inline-flex items-center gap-1 rounded-full border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 px-3 py-1 font-semibold text-[#6ee7b7]">MC {metacriticScore}</span>}
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/8 px-3 py-1 font-semibold text-white/82"><Star size={14} className={typeof userRating === "number" ? "fill-white text-white" : "text-white/55"} /> Your {typeof userRating === "number" ? (userRating / 2).toFixed(1) : "—"}/5</span>
                  <span>{getYear(display as DetailData)}</span>
                  <span>{genreText}</span>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {canWatch ? (
                    <button
                      onClick={() => onOpenWatch({
                        url: "",
                        title: title,
                        mediaType,
                        tmdbId: resolvedTmdbId || undefined,
                        season: mediaType === "tv" ? selectedSeason : undefined,
                        episode: mediaType === "tv" ? currentEpisodeNumber : undefined,
                      })}
                      className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-white px-7 text-[18px] font-semibold text-black shadow-[0_10px_25px_rgba(255,255,255,0.14)] transition hover:brightness-105"
                    >
                      <Play size={18} className="fill-black" /> Watch Now
                    </button>
                  ) : (
                    <div className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-white/20 px-7 text-[18px] font-semibold text-white/45">
                      <Play size={18} className="fill-white/45" /> Loading...
                    </div>
                  )}
                  {trailerKey && (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailerKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-14 items-center gap-3 rounded-[14px] border border-white/18 bg-white/8 px-6 text-[16px] font-semibold text-white backdrop-blur transition hover:bg-white/14"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#ff0000]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                      </svg>
                      Trailer
                    </a>
                  )}
                  <button onClick={onToggleWatchlist} className={cn("inline-flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur transition", inWatchlist ? "border-[#efb43f] bg-[#efb43f] text-black" : "border-white/18 bg-white/8 text-white hover:bg-white/14")}>
                    <Bookmark size={18} className={inWatchlist ? "fill-black" : ""} />
                  </button>
                  <button onClick={onToggleWatched} className={cn("inline-flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur transition", inWatched ? "border-white bg-white text-black" : "border-white/18 bg-white/8 text-white hover:bg-white/14")}>
                    <Eye size={18} className={inWatched ? "fill-black" : ""} />
                  </button>
                  <InlineRatingControl value={userRating} onChange={onRate} />
                  <button
                    onClick={() => similarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="inline-flex h-14 items-center gap-3 rounded-full border border-white/18 bg-white/8 px-6 text-[18px] font-medium text-white backdrop-blur transition hover:bg-white/14"
                  >
                    <Bookmark size={18} /> Similars
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1340px] px-6 pb-14 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                <div className="mb-5 text-[20px] font-semibold text-white">{tr(appLanguage, "synopsis")}</div>
                <p className="text-[15px] leading-8 text-white/72">{detail?.overview || ("overview" in item ? item.overview : "") || "No overview available."}</p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                <div className="mb-5 flex items-center gap-2 text-[20px] font-semibold text-white">
                  <span className="h-5 w-[2px] rounded-full bg-[#ef4444]" />
                  {tr(appLanguage, "details")}
                </div>
                <div className="space-y-3 text-[15px]">
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">IMDb:</span><span className="font-semibold text-white"><span className="text-[#efb43f]">{score}</span> <span className="text-white/42">{imdbVotes ? `${imdbVotes.toLocaleString()} votes` : omdbData?.imdbVotes && omdbData.imdbVotes !== "N/A" ? omdbData.imdbVotes : ""}</span></span></div>
                  {rtRating && <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Rotten Tomatoes:</span><span className="font-semibold text-[#f97316]">🍅 {rtRating}</span></div>}
                  {metacriticScore && <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Metacritic:</span><span className="font-semibold text-[#6ee7b7]">{metacriticScore}</span></div>}
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Your rating:</span><span className="font-semibold text-white">{typeof userRating === "number" ? `${(userRating / 2).toFixed(1)}/5` : "Not rated"}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "year")}:</span><span className="font-semibold text-white">{getYear(display as DetailData)}</span></div>
                  {runtimeText ? <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "runtime")}:</span><span className="font-semibold text-white">{runtimeText}</span></div> : null}
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "genres")}:</span><span className="font-semibold text-white">{genreText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "languageLabel")}:</span><span className="font-semibold text-white">{languageText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "studio")}:</span><span className="font-semibold text-white">{studioText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "director")}:</span><span className="font-semibold text-white">{directorText !== "Unknown" ? directorText : (omdbData?.Director && omdbData.Director !== "N/A" ? omdbData.Director : directorText)}</span></div>
                  {omdbWriter && <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Writer:</span><span className="font-semibold text-white">{omdbWriter}</span></div>}
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "release")}:</span><span className="font-semibold text-white">{releaseDate}</span></div>
                  {boxOffice && <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Box Office:</span><span className="font-semibold text-white">{boxOffice}</span></div>}
                  {omdbAwards && <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Awards:</span><span className="font-semibold text-[#efb43f]">🏆 {omdbAwards}</span></div>}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                {castForDisplay.length ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                    <div className="mb-5 flex items-center gap-2 text-[20px] font-semibold text-white">
                      <span className="h-5 w-[2px] rounded-full bg-[#ef4444]" />
                      Actors
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {castForDisplay.map((person, index) => (
                        <motion.button
                          key={person.id}
                          onClick={() => setPersonModalId(person.id)}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                          className="group flex items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] p-3 text-left transition hover:border-white/14 hover:bg-white/[0.05] cursor-pointer"
                        >
                          <div className="h-14 w-14 overflow-hidden rounded-full bg-[#1b2333] ring-1 ring-white/8">
                            {person.profile_path ? (
                              <img src={`${POSTER_BASE}${person.profile_path}`} alt={person.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/38">No photo</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold text-white">{person.name}</div>
                            <div className="truncate text-[12px] text-white/45">{person.character || "Cast"}</div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {mediaType === "tv" ? (() => {
                  const seasonMeta = (detail?.seasons || []).filter((s) => s.season_number > 0);
                  const selectedSeasonMeta = seasonMeta.find((s) => s.season_number === selectedSeason);
                  const totalEpisodes = episodes.length || selectedSeasonMeta?.episode_count || 0;
                  const watchedCount = watchedEpisodes.length;
                  const remainingCount = Math.max(totalEpisodes - watchedCount, 0);
                  const progressPercent = totalEpisodes ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
                  const currentFilter = library.watching[String(item.id)]?.episodeFilter || "all";
                  const visibleEpisodes = episodes.filter((ep) => {
                    const isWatched = watchedEpisodes.includes(ep.episode_number);
                    if (currentFilter === "watched") return isWatched;
                    if (currentFilter === "unwatched") return !isWatched;
                    return true;
                  });
                  
                  return (
                    <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                      <SectionHeading title={tr(appLanguage, "episodeTracker")} />

                      <div className="mb-5 rounded-[18px] border border-white/8 bg-white/[0.025] p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-[15px] font-semibold text-white">Season {selectedSeason}</div>
                            <div className="mt-1 text-sm text-white/45">{watchedCount} watched · {remainingCount} remaining · Current E{selectedEpisode || savedSelectedEpisode || 1}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-white/72">
                            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5">{totalEpisodes} total</span>
                            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5">{progressPercent}% complete</span>
                          </div>
                        </div>
                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#efb43f] transition-all" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <select
                          value={selectedSeason}
                          onChange={(e) => loadSeason(Number(e.target.value))}
                          className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none"
                        >
                          {seasonMeta.map((season) => {
                            const seasonWatched = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(season.season_number)]?.length || 0;
                            return (
                              <option key={season.season_number} value={season.season_number}>
                                S{season.season_number} ({seasonWatched}/{season.episode_count || 0})
                              </option>
                            );
                          })}
                        </select>

                        <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                          {[
                            { key: "all", label: "All" },
                            { key: "watched", label: "Watched" },
                            { key: "unwatched", label: "Unwatched" },
                          ].map((filter) => (
                            <button
                              key={filter.key}
                              onClick={() => setEpisodeFilter(item.id, filter.key as "all" | "watched" | "unwatched")}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                                currentFilter === filter.key ? "bg-[#efb43f] text-black" : "text-white/60 hover:text-white"
                              )}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => continueToNextEpisode(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
                        >
                          Continue here
                        </button>
                        <button
                          onClick={() => markEpisodesUpTo(item.id, selectedSeason, selectedEpisode || savedSelectedEpisode || 1)}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
                        >
                          Mark previous watched
                        </button>
                        <button
                          onClick={() => markSeasonComplete(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
                        >
                          Mark season complete
                        </button>
                        <button
                          onClick={() => clearSeasonEpisodes(item.id, selectedSeason)}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          Reset season
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                        {visibleEpisodes.map((ep) => {
                          const checked = watchedEpisodes.includes(ep.episode_number);
                          const activeEpisode = (selectedEpisode || savedSelectedEpisode) === ep.episode_number;
                          return (
                            <div
                              key={ep.id}
                              className={cn(
                                "flex items-center justify-between rounded-[16px] border px-4 py-3 transition",
                                activeEpisode ? "border-[#efb43f]/40 bg-[#efb43f]/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                              )}
                            >
                              <button
                                onClick={() => setCurrentEpisode(item.id, ep.episode_number)}
                                className="flex min-w-0 flex-1 items-center gap-4 text-left"
                              >
                                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", activeEpisode ? "bg-[#efb43f] text-black" : "bg-white/8 text-white/72")}>
                                  E{ep.episode_number}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-white">{ep.name}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/42">
                                    {ep.runtime ? <span>{ep.runtime}m</span> : null}
                                    {ep.air_date ? <span>{ep.air_date}</span> : null}
                                    {activeEpisode ? <span className="text-[#efb43f]">Current</span> : null}
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={() => toggleEpisode(item.id, ep.episode_number)}
                                className={cn("ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition", checked ? "bg-[#efb43f] text-black" : "border border-white/10 text-white/40 hover:bg-white/[0.06]")}
                              >
                                {checked ? <Check size={14} /> : null}
                              </button>
                            </div>
                          );
                        })}
                        {!visibleEpisodes.length ? (
                          <div className="rounded-[14px] border border-white/8 bg-white/[0.025] px-4 py-6 text-center text-sm text-white/45">No episodes in this filter.</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })() : null}
              </div>
            </div>

            {similarItems.length ? (
              <div ref={similarSectionRef} className="mt-10 rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                <div className="mb-5 flex items-center gap-2 text-[20px] font-semibold text-white">
                  <span className="h-5 w-[2px] rounded-full bg-[#ef4444]" />
                  You may like
                </div>
                <Grid
                  items={similarItems}
                  mediaType={mediaType}
                  onOpen={(nextItem, nextType) => onOpenRelated(nextItem as MediaItem, nextType)}
                  onToggleWatchlist={(nextItem, nextType) => onToggleSimilarWatchlist(nextItem as MediaItem, nextType)}
                  onToggleWatched={(nextItem, nextType) => onToggleSimilarWatched(nextItem as MediaItem, nextType)}
                  watchlistKeys={similarWatchlistKeys}
                  watchedKeys={similarWatchedKeys}
                  ratings={ratingsMap}
                />
              </div>
            ) : null}

            {/* ── AI Recommendations ──────────────────────────── */}
            <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[18px] font-semibold text-white">
                  <span className="h-5 w-[2px] rounded-full bg-purple-500" />
                  AI Picks For You
                </div>
                {!aiRecs.length && (
                  <button
                    onClick={async () => {
                      setAiLoading(true);
                      const recs = await fetchAiRecommendations(title, mediaType!, genreText, detail?.overview || "");
                      setAiRecs(recs);
                      setAiLoading(false);
                    }}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 border border-purple-500/25 px-4 py-1.5 text-[13px] font-semibold text-purple-400 transition hover:bg-purple-500/25 disabled:opacity-50"
                  >
                    {aiLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}><RefreshCw size={13} /></motion.div> : "✨"}
                    {aiLoading ? "Thinking..." : "Get Suggestions"}
                  </button>
                )}
                {aiRecs.length > 0 && (
                  <button onClick={() => setAiRecs([])} className="text-[12px] text-white/30 hover:text-white/60">Reset</button>
                )}
              </div>
              {aiRecs.length > 0 ? (
                <div className="space-y-2">
                  {aiRecs.map((rec, i) => (
                    <motion.div
                      key={rec}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 rounded-[13px] border border-white/6 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="text-[13px] font-bold text-purple-400/60 w-5 shrink-0">{i + 1}</span>
                      <span className="text-[14px] font-semibold text-white flex-1">{rec}</span>
                      <button
                        onClick={() => {
                          const q = rec;
                          tmdbFetch<{ results: MediaItem[] }>("/search/multi", { query: q })
                            .then((res) => {
                              const found = (res.results || []).find(x => x.media_type === "movie" || x.media_type === "tv");
                              if (found) onOpenRelated(found, (found.media_type as MediaType) || mediaType!);
                            }).catch(() => {});
                        }}
                        className="text-[11px] font-semibold text-purple-400 hover:underline shrink-0"
                      >
                        Open →
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : !aiLoading ? (
                <div className="text-[13px] text-white/30">Click "Get Suggestions" for AI-powered recommendations based on this {mediaType === "tv" ? "show" : "movie"}.</div>
              ) : null}
            </div>

            {/* ── My Notes ────────────────────────────────────── */}
            <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[18px] font-semibold text-white">
                  <span className="h-5 w-[2px] rounded-full bg-[#efb43f]" />
                  My Notes
                </div>
                {noteSaved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[12px] text-emerald-400">
                    <Check size={12} /> Saved
                  </motion.span>
                )}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false); }}
                placeholder={`Write your thoughts on "${title}"... (spoilers, personal rating, memorable scenes)`}
                rows={4}
                className="w-full resize-none rounded-[14px] border border-white/8 bg-white/[0.04] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/25 focus:border-[#efb43f]/30 focus:bg-white/[0.06] transition"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-white/25">{noteText.length} characters</span>
                <button
                  onClick={() => {
                    if (item && mediaType) {
                      const itemKey = keyFor({ id: item.id, mediaType: "mediaType" in item ? item.mediaType : mediaType });
                      onSaveNote(itemKey, noteText);
                      setNoteSaved(true);
                      setTimeout(() => setNoteSaved(false), 2500);
                    }
                  }}
                  className="rounded-[11px] bg-[#efb43f] px-5 py-2 text-[13px] font-bold text-black transition hover:brightness-110"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Actor/Director modal — rendered inside DetailModal so it inherits z-index context */}
      <PersonModal
        open={personModalId !== null}
        personId={personModalId}
        onClose={() => setPersonModalId(null)}
        onOpenItem={(item, mediaType) => {
          setPersonModalId(null);
          onOpenRelated(item, mediaType);
        }}
      />
    </AnimatePresence>
  );
}

export default function GoodFilmApp() {
    const [appLanguage, setAppLanguage] = useState<AppLanguage>(loadLanguage);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsAnchorTop, setSettingsAnchorTop] = useState(88);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [currentUser, setCurrentUser] = useState<CloudUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState<UserLibrary>(() => loadLibrary());
  // Prevents uploading to cloud before we've pulled down the user's existing data
  const cloudSyncReady = useRef(false);
  // Prevents upload on the very first render (before any user action)
  const isFirstRender = useRef(true);

  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [fanFavorites, setFanFavorites] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<MediaItem[]>([]);
  const [crimeTV, setCrimeTV] = useState<MediaItem[]>([]);
  const [dramaTV, setDramaTV] = useState<MediaItem[]>([]);
  const [sciFiFantasyTV, setSciFiFantasyTV] = useState<MediaItem[]>([]);
  const [animationTV, setAnimationTV] = useState<MediaItem[]>([]);
  const [comedyTV, setComedyTV] = useState<MediaItem[]>([]);
    const [latestMovies, setLatestMovies] = useState<MediaItem[]>([]);
  const [latestSeries, setLatestSeries] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<MediaItem[]>([]);
  const [crimeThrillers, setCrimeThrillers] = useState<MediaItem[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<MediaItem[]>([]);
  const [dramaSeries, setDramaSeries] = useState<MediaItem[]>([]);
  const [actionAdventureTV, setActionAdventureTV] = useState<MediaItem[]>([]);
  const [mysteryTV, setMysteryTV] = useState<MediaItem[]>([]);  const [awardWinningTV, setAwardWinningTV] = useState<MediaItem[]>([]);  const [becauseYouWatchedTitle, setBecauseYouWatchedTitle] = useState<string>("");
  const [becauseYouWatchedItems, setBecauseYouWatchedItems] = useState<StreamingRowItem[]>([]);
  // Extra movie genres
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  const [comedyMovies, setComedyMovies] = useState<MediaItem[]>([]);
  const [documentaryMovies, setDocumentaryMovies] = useState<MediaItem[]>([]);
  const [familyMovies, setFamilyMovies] = useState<MediaItem[]>([]);
  const [animationMovies, setAnimationMovies] = useState<MediaItem[]>([]);
  const [thrillerMovies, setThrillerMovies] = useState<MediaItem[]>([]);
  const [historyMovies, setHistoryMovies] = useState<MediaItem[]>([]);
  const [westernMovies, setWesternMovies] = useState<MediaItem[]>([]);
  const [musicMovies, setMusicMovies] = useState<MediaItem[]>([]);
  const [warMovies, setWarMovies] = useState<MediaItem[]>([]);
  // Extra TV genres
  const [realityTV, setRealityTV] = useState<MediaItem[]>([]);
  const [documentaryTV, setDocumentaryTV] = useState<MediaItem[]>([]);
  const [kidsTV, setKidsTV] = useState<MediaItem[]>([]);
  const [warPoliticsTV, setWarPoliticsTV] = useState<MediaItem[]>([]);
  const [familyTV, setFamilyTV] = useState<MediaItem[]>([]);
  const [talkShowTV, setTalkShowTV] = useState<MediaItem[]>([]);
  const [netflixOriginals, setNetflixOriginals] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);

  const [selectedItem, setSelectedItem] = useState<MediaItem | LibraryItem | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [watchPayload, setWatchPayload] = useState<{ url: string; title: string; mediaType: MediaType; tmdbId?: number; season?: number; episode?: number } | null>(null);

  const [homeError, setHomeError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bulkLinking, setBulkLinking] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setLibrary(loadLibrary());
    setCurrentUser(null);
    setUserProfile(null);
    if (!getLibraryUpdatedAt()) setLibraryUpdatedAt();
  }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id && data.user.email) {
        const user: CloudUser = { id: data.user.id, email: data.user.email, provider: "supabase" };
        setCurrentUser(user);
        setUserProfile(loadUserProfile(user.email));
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id && session.user.email) {
        const user: CloudUser = { id: session.user.id, email: session.user.email, provider: "supabase" };
        setCurrentUser(user);
        // On sign-in or token refresh, pull cloud library immediately
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          downloadLibraryFromCloud(user)
            .then((cloudRow) => {
              if (!cloudRow?.library) return;
              setLibrary((prev) => {
                const localScore = libraryScore(prev);
                const cloudScore = libraryScore(cloudRow.library);
                return mergeLibraries(
                  localScore >= cloudScore ? prev : cloudRow.library,
                  localScore >= cloudScore ? cloudRow.library : prev
                );
              });
            })
            .catch((err) => {
              if (!isMissingCloudTableError(err)) console.error("Cloud sync on auth change failed", err);
            });
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }    setUserProfile(loadUserProfile(currentUser.email));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      cloudSyncReady.current = false;
      return;
    }
    downloadLibraryFromCloud(currentUser)
      .then((cloudRow) => {
        if (cloudRow?.library) {
          setLibrary((prev) => {
            const localScore = libraryScore(prev);
            const cloudScore = libraryScore(cloudRow.library);
            return mergeLibraries(
              localScore >= cloudScore ? prev : cloudRow.library,
              localScore >= cloudScore ? cloudRow.library : prev
            );
          });
        }
      })
      .catch((err) => {
        if (!isMissingCloudTableError(err)) {
          console.error("Cloud download failed", err);
        }
      })
      .finally(() => {
        cloudSyncReady.current = true;
      });
  }, [currentUser?.id]);

  useEffect(() => {
    // Always save to localStorage
    const raw = JSON.stringify(library);
    localStorage.setItem(STORAGE_KEY, raw);
    localStorage.setItem(BACKUP_KEY, raw);
    setLibraryUpdatedAt();

    // Skip cloud upload on first render (app just loaded — wait for cloud pull first)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only upload after cloud pull has completed (cloudSyncReady set in download .finally())
    if (currentUser && cloudSyncReady.current) {
      uploadLibraryToCloud(currentUser, library).catch((err) => {
        if (!isMissingCloudTableError(err)) {
          console.error("Cloud upload failed", err);
        }
      });
    }
  }, [library, currentUser?.id]);

  const refreshHomeData = useCallback(() => {
    Promise.all([
      tmdbFetch<{ results: MediaItem[] }>("/trending/movie/week"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/popular"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/top_rated"),
      tmdbFetch<{ results: MediaItem[] }>("/tv/popular"),
      tmdbFetch<{ results: MediaItem[] }>("/tv/top_rated"),      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 80, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10765, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 16, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 35, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { sort_by: "release_date.desc", page: 1, "vote_count.gte": 20 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { sort_by: "first_air_date.desc", page: 1, "vote_count.gte": 10 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 28, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 878, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 80, with_keywords: 10364, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10749, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10759, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 9648, sort_by: "popularity.desc", page: 1 }),      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "vote_average.desc", "vote_count.gte": 300, page: 1 }),
      // Extra movie genres
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 27, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 35, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 99, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10751, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 16, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 53, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 36, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 37, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10402, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10752, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/movie/top_rated", { page: 1 }),
      // Extra TV genres
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10764, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 99, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10762, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10768, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10751, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10767, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_networks: 213, sort_by: "popularity.desc", page: 1 }),
    ])
      .then(([trending, movies, topMovies, tv, topTv, crime, drama, scifiFantasy, animation, comedy, latestMovieResults, latestTvResults, actionGenre, sciFiGenre, crimeThrillerGenre, romanceGenre, dramaSeriesGenre, actionAdventureGenre, mysteryGenre, awardWinningGenre,
        horrorGenre, comedyMovieGenre, docMovieGenre, familyMovieGenre, animMovieGenre, thrillerMovieGenre, historyMovieGenre, westernMovieGenre, musicMovieGenre, warMovieGenre, topRatedMovieGenre,
        realityTVGenre, docTVGenre, kidsTVGenre, warPoliticsTVGenre, familyTVGenre, talkTVGenre, netflixOriginalsGenre]) => {
        setTrendingMovies(uniqueMediaItems((trending.results || []).slice(0, 24), "movie").slice(0, 18));
        setPopularMovies(uniqueMediaItems((movies.results || []).slice(0, 24), "movie").slice(0, 18));
        setFanFavorites(uniqueMediaItems((topMovies.results || []).slice(0, 24), "movie").slice(0, 18));
        setPopularSeries(uniqueMediaItems((tv.results || []).slice(0, 24), "tv").slice(0, 18));
        setTopRatedTV(uniqueMediaItems((topTv.results || []).slice(0, 24), "tv").slice(0, 18));
        setCrimeTV(uniqueMediaItems((crime.results || []).slice(0, 24), "tv").slice(0, 18));
        setDramaTV(uniqueMediaItems((drama.results || []).slice(0, 24), "tv").slice(0, 18));
        setSciFiFantasyTV(uniqueMediaItems((scifiFantasy.results || []).slice(0, 24), "tv").slice(0, 18));
        setAnimationTV(uniqueMediaItems((animation.results || []).slice(0, 24), "tv").slice(0, 18));
        setComedyTV(uniqueMediaItems((comedy.results || []).slice(0, 24), "tv").slice(0, 18));        setLatestMovies(uniqueMediaItems((latestMovieResults.results || []).slice(0, 24), "movie").slice(0, 18));
        setLatestSeries(uniqueMediaItems((latestTvResults.results || []).slice(0, 24), "tv").slice(0, 18));
        setActionMovies(uniqueMediaItems((actionGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setSciFiMovies(uniqueMediaItems((sciFiGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setCrimeThrillers(uniqueMediaItems((crimeThrillerGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setRomanceMovies(uniqueMediaItems((romanceGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setDramaSeries(uniqueMediaItems((dramaSeriesGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setActionAdventureTV(uniqueMediaItems((actionAdventureGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setMysteryTV(uniqueMediaItems((mysteryGenre.results || []).slice(0, 24), "tv").slice(0, 18));        setAwardWinningTV(uniqueMediaItems((awardWinningGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        // Extra movie genres
        setHorrorMovies(uniqueMediaItems((horrorGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setComedyMovies(uniqueMediaItems((comedyMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setDocumentaryMovies(uniqueMediaItems((docMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setFamilyMovies(uniqueMediaItems((familyMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setAnimationMovies(uniqueMediaItems((animMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setThrillerMovies(uniqueMediaItems((thrillerMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setHistoryMovies(uniqueMediaItems((historyMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setWesternMovies(uniqueMediaItems((westernMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setMusicMovies(uniqueMediaItems((musicMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setWarMovies(uniqueMediaItems((warMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setTopRatedMovies(uniqueMediaItems((topRatedMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        // Extra TV genres
        setRealityTV(uniqueMediaItems((realityTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setDocumentaryTV(uniqueMediaItems((docTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setKidsTV(uniqueMediaItems((kidsTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setWarPoliticsTV(uniqueMediaItems((warPoliticsTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setFamilyTV(uniqueMediaItems((familyTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setTalkShowTV(uniqueMediaItems((talkTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setNetflixOriginals(uniqueMediaItems((netflixOriginalsGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setFeatured((trending.results || [])[1] || (movies.results || [])[0] || null);
        setHomeError(null);
      })
      .catch(() => setHomeError("TMDB data failed to load. Add your bearer token or API key at the top of the file."));
  }, []);

  useEffect(() => {
    refreshHomeData();

    const handleRefresh = () => refreshHomeData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshHomeData();
    };

    const interval = window.setInterval(refreshHomeData, 300000);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshHomeData]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);

    // Run TMDB multi-search + OMDB search in parallel
    Promise.all([
      tmdbFetch<{ results: MediaItem[] }>("/search/multi", { query: q, include_adult: "false" }),
      omdbFetch({ s: q, type: "movie" }).catch(() => null),
      omdbFetch({ s: q, type: "series" }).catch(() => null),
    ])
      .then(async ([tmdbRes, omdbMovies, omdbSeries]) => {
        const tmdbResults = (tmdbRes.results || []).filter(
          (x) => x.media_type === "movie" || x.media_type === "tv"
        );

        // Merge OMDB results: if OMDB has items not in TMDB top results, fetch them from TMDB by title
        const omdbItems = [
          ...((omdbMovies as any)?.Search || []),
          ...((omdbSeries as any)?.Search || []),
        ] as Array<{ Title: string; Year: string; imdbID: string; Type: string; Poster: string }>;

        // Find OMDB titles not already in TMDB results (by title similarity)
        const tmdbTitles = new Set(tmdbResults.map(r => getTitle(r).toLowerCase()));
        const extraTitles = omdbItems
          .filter(o => !tmdbTitles.has(o.Title.toLowerCase()))
          .slice(0, 5);

        let extras: MediaItem[] = [];
        if (extraTitles.length > 0) {
          const extraFetches = await Promise.allSettled(
            extraTitles.map(o =>
              tmdbFetch<{ results: MediaItem[] }>("/search/multi", {
                query: o.Title,
                year: o.Year?.slice(0, 4),
                include_adult: "false",
              }).then(r =>
                (r.results || [])
                  .filter(x => x.media_type === "movie" || x.media_type === "tv")
                  .slice(0, 1)
              ).catch(() => [])
            )
          );
          extras = extraFetches
            .filter((r): r is PromiseFulfilledResult<MediaItem[]> => r.status === "fulfilled")
            .flatMap(r => r.value);
        }

        // Merge and dedupe by id
        const seen = new Set<number>();
        const merged = [...tmdbResults, ...extras].filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        setSearchResults(merged);
        setSearchError(null);
      })
      .catch(() => setSearchError("Search request failed."))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch]);

  const watchlistKeys = useMemo(() => new Set(library.watchlist.map(keyFor)), [library.watchlist]);
  const watchedKeys = useMemo(() => new Set(library.watched.map(keyFor)), [library.watched]);

  const toRowItems = useCallback((items: Array<MediaItem | LibraryItem>, fallbackType?: MediaType, extras?: Partial<StreamingRowItem>) => {
    return items.map((entry) => {
      const mediaType = "mediaType" in entry ? entry.mediaType : entry.media_type || (entry.first_air_date ? "tv" : fallbackType || "movie");
      return {
        id: entry.id,
        mediaType,
        title: "mediaType" in entry ? entry.title : getTitle(entry),
        image: "mediaType" in entry ? (entry.backdropPath || entry.posterPath) : (entry.backdrop_path || entry.poster_path || null),
        sourceItem: entry,
        ...extras,
      } as StreamingRowItem;
    });
  }, []);

  const continueWatchingItems = useMemo(() => {
    return Object.entries(library.watching)
      .map(([showId, progress]) => {
        const numericId = Number(showId);
        const source =
          popularSeries.find((item) => item.id === numericId) ||
          latestSeries.find((item) => item.id === numericId) ||
          crimeTV.find((item) => item.id === numericId) ||
          dramaTV.find((item) => item.id === numericId) ||
          sciFiFantasyTV.find((item) => item.id === numericId) ||
          animationTV.find((item) => item.id === numericId) ||
          comedyTV.find((item) => item.id === numericId) ||
          library.watchlist.find((item) => item.id === numericId && item.mediaType === "tv") ||
          library.watched.find((item) => item.id === numericId && item.mediaType === "tv");
        if (!source) return null;

        const season = progress.season || 1;
        const watchedEpisodes = progress.watchedEpisodesBySeason?.[String(season)] || [];
        const currentEpisode = progress.selectedEpisodeBySeason?.[String(season)] || watchedEpisodes[watchedEpisodes.length - 1] || 1;
        const progressPercent = Math.min(100, Math.max(8, watchedEpisodes.length * 12.5));

        return {
          id: source.id,
          mediaType: "tv" as MediaType,
          title: "mediaType" in source ? source.title : getTitle(source),
          image: "mediaType" in source ? (source.backdropPath || source.posterPath) : (source.backdrop_path || source.poster_path || null),
          subtitle: `Season ${season} · Episode ${currentEpisode}`,
          progress: progressPercent,
          meta: `${watchedEpisodes.length} watched episodes`,
          sourceItem: source as MediaItem | LibraryItem,
        } as StreamingRowItem;
      })
      .filter(Boolean) as StreamingRowItem[];
  }, [library.watching, library.watchlist, library.watched, popularSeries, latestSeries, crimeTV, dramaTV, sciFiFantasyTV, animationTV, comedyTV]);

  const homeRows = useMemo(() => uniqueRowDefinitions([
    { title: tr(appLanguage, "trendingNow"), items: trendingMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "latestMovies"), items: latestMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "popularTVSeries"), items: popularSeries, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "fanFavorites"), items: fanFavorites, mediaType: "movie" as MediaType },
    { title: "Action Movies", items: actionMovies, mediaType: "movie" as MediaType },
    { title: "Netflix Originals", items: netflixOriginals, mediaType: "tv" as MediaType },
    { title: "Horror Movies", items: horrorMovies, mediaType: "movie" as MediaType },
    { title: "Drama Series", items: dramaSeries, mediaType: "tv" as MediaType },
    { title: "Comedy Movies", items: comedyMovies, mediaType: "movie" as MediaType },
    { title: "Top Rated Movies", items: topRatedMovies, mediaType: "movie" as MediaType },
    { title: "Sci-Fi & Fantasy TV", items: sciFiFantasyTV, mediaType: "tv" as MediaType },
    { title: "Thriller Movies", items: thrillerMovies, mediaType: "movie" as MediaType },
    { title: "Animation Movies", items: animationMovies, mediaType: "movie" as MediaType },
    { title: "Award-Winning Drama", items: awardWinningTV, mediaType: "tv" as MediaType },
    { title: "Family Movies", items: familyMovies, mediaType: "movie" as MediaType },
    { title: "Documentary", items: documentaryMovies, mediaType: "movie" as MediaType },
    { title: "Mystery TV", items: mysteryTV, mediaType: "tv" as MediaType },
    { title: "Reality TV", items: realityTV, mediaType: "tv" as MediaType },
    { title: "War Movies", items: warMovies, mediaType: "movie" as MediaType },
    { title: "Romance Movies", items: romanceMovies, mediaType: "movie" as MediaType },
    { title: "Kids & Family TV", items: kidsTV, mediaType: "tv" as MediaType },
    { title: "Crime Thrillers", items: crimeThrillers, mediaType: "movie" as MediaType },
    { title: "Talk Shows", items: talkShowTV, mediaType: "tv" as MediaType },
  ]), [appLanguage, trendingMovies, latestMovies, popularSeries, fanFavorites, actionMovies, dramaSeries, awardWinningTV, horrorMovies, comedyMovies, topRatedMovies, sciFiFantasyTV, thrillerMovies, animationMovies, familyMovies, documentaryMovies, netflixOriginals, mysteryTV, realityTV, warMovies, romanceMovies, kidsTV, crimeThrillers, talkShowTV]);

  const movieRows = useMemo(() => uniqueRowDefinitions([
    { title: tr(appLanguage, "latestMovies"), items: latestMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "popularMovies"), items: popularMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "trendingMovies"), items: trendingMovies, mediaType: "movie" as MediaType },
    { title: "Top Rated Movies", items: topRatedMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "fanFavorites"), items: fanFavorites, mediaType: "movie" as MediaType },
    { title: "Action Movies", items: actionMovies, mediaType: "movie" as MediaType },
    { title: "Sci-Fi Movies", items: sciFiMovies, mediaType: "movie" as MediaType },
    { title: "Horror Movies", items: horrorMovies, mediaType: "movie" as MediaType },
    { title: "Comedy Movies", items: comedyMovies, mediaType: "movie" as MediaType },
    { title: "Thriller Movies", items: thrillerMovies, mediaType: "movie" as MediaType },
    { title: "Crime Thrillers", items: crimeThrillers, mediaType: "movie" as MediaType },
    { title: "Romance Movies", items: romanceMovies, mediaType: "movie" as MediaType },
    { title: "Animation Movies", items: animationMovies, mediaType: "movie" as MediaType },
    { title: "Family Movies", items: familyMovies, mediaType: "movie" as MediaType },
    { title: "Documentary Movies", items: documentaryMovies, mediaType: "movie" as MediaType },
    { title: "History Movies", items: historyMovies, mediaType: "movie" as MediaType },
    { title: "War Movies", items: warMovies, mediaType: "movie" as MediaType },
    { title: "Western Movies", items: westernMovies, mediaType: "movie" as MediaType },
    { title: "Music Movies", items: musicMovies, mediaType: "movie" as MediaType },
  ]), [appLanguage, latestMovies, popularMovies, trendingMovies, fanFavorites, actionMovies, sciFiMovies, crimeThrillers, romanceMovies, topRatedMovies, horrorMovies, comedyMovies, thrillerMovies, animationMovies, familyMovies, documentaryMovies, historyMovies, warMovies, westernMovies, musicMovies]);

  const seriesRows = useMemo(() => uniqueRowDefinitions([
    { title: tr(appLanguage, "latestSeries"), items: latestSeries, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "popularTVSeries"), items: popularSeries, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "topRatedTV"), items: topRatedTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "crimeTV"), items: crimeTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "dramaTV"), items: dramaTV, mediaType: "tv" as MediaType },
    { title: "Drama Series", items: dramaSeries, mediaType: "tv" as MediaType },
    { title: "Action & Adventure TV", items: actionAdventureTV, mediaType: "tv" as MediaType },
    { title: "Mystery TV", items: mysteryTV, mediaType: "tv" as MediaType },
    { title: "Award-Winning Drama", items: awardWinningTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "sciFiFantasyTV"), items: sciFiFantasyTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "animationTV"), items: animationTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "comedyTV"), items: comedyTV, mediaType: "tv" as MediaType },
    { title: "Reality TV", items: realityTV, mediaType: "tv" as MediaType },
    { title: "Documentary Series", items: documentaryTV, mediaType: "tv" as MediaType },
    { title: "Kids & Family TV", items: kidsTV, mediaType: "tv" as MediaType },
    { title: "War & Politics", items: warPoliticsTV, mediaType: "tv" as MediaType },
    { title: "Family TV", items: familyTV, mediaType: "tv" as MediaType },
    { title: "Talk Shows", items: talkShowTV, mediaType: "tv" as MediaType },
    { title: "Netflix Originals", items: netflixOriginals, mediaType: "tv" as MediaType },
  ]), [appLanguage, latestSeries, popularSeries, topRatedTV, crimeTV, dramaTV, dramaSeries, actionAdventureTV, mysteryTV, awardWinningTV, sciFiFantasyTV, animationTV, comedyTV, realityTV, documentaryTV, kidsTV, warPoliticsTV, familyTV, talkShowTV, netflixOriginals]);

  const streamingRows = useMemo(() => ([
    { title: "Trending Now", items: toRowItems([...trendingMovies.slice(0, 8), ...popularSeries.slice(0, 8)], undefined, { badge: "Discovery" }) },
    { title: "Trending Movies", items: toRowItems(trendingMovies, "movie", { badge: "Discovery" }) },
    { title: "Trending Series", items: toRowItems(popularSeries, "tv", { badge: "Discovery" }) },
    { title: "Popular on GoodFilm", items: toRowItems([...popularMovies.slice(0, 10), ...popularSeries.slice(0, 8)], undefined, { badge: "Discovery" }) },
    { title: "Top Rated Movies", items: toRowItems(fanFavorites, "movie", { badge: "Discovery" }) },
    { title: "Top Rated Series", items: toRowItems(topRatedTV, "tv", { badge: "Discovery" }) },
    { title: "Action Movies", items: toRowItems(actionMovies, "movie", { badge: "Genre" }) },
    { title: "Sci-Fi Movies", items: toRowItems(sciFiMovies, "movie", { badge: "Genre" }) },
    { title: "Crime Thrillers", items: toRowItems(crimeThrillers, "movie", { badge: "Genre" }) },
    { title: "Romance Movies", items: toRowItems(romanceMovies, "movie", { badge: "Genre" }) },
    { title: "Drama Series", items: toRowItems(dramaSeries, "tv", { badge: "Genre" }) },
  ]), [toRowItems, trendingMovies, popularSeries, popularMovies, fanFavorites, topRatedTV, actionMovies, sciFiMovies, crimeThrillers, romanceMovies, dramaSeries]);

  const dailyRecommendationSeed = useMemo(() => {
    const watchedMovies = library.watched.filter((item) => {
      if (item.mediaType !== "movie") return false;
      const rating = library.ratings[keyFor(item)];
      return typeof rating === "number" && rating >= 7 && rating <= 10;
    });
    if (!watchedMovies.length) return null;

    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const start = Date.UTC(utcYear, 0, 0);
    const today = Date.UTC(utcYear, now.getUTCMonth(), now.getUTCDate());
    const dayOfYear = Math.floor((today - start) / 86400000);
    const index = (dayOfYear - 1) % watchedMovies.length;
    return watchedMovies[index] || watchedMovies[0] || null;
  }, [library.watched, library.ratings]);

  useEffect(() => {
    let cancelled = false;

    const loadBecauseYouWatched = async () => {
      const seed = dailyRecommendationSeed;
      if (!seed) {
        setBecauseYouWatchedTitle("");
        setBecauseYouWatchedItems([]);
        return;
      }

      try {
        let tmdbId = seed.id;
        let tmdbType: MediaType = seed.mediaType;
        let displayTitle = seed.title;

        const matched = await searchTMDBMatchForLibraryItem(seed);
        if (matched) {
          tmdbId = matched.id;
          tmdbType = seed.mediaType;
          displayTitle = getTitle(matched);
        }

        const recs = await tmdbFetch<{ results: MediaItem[] }>(`/${tmdbType}/${tmdbId}/recommendations`);
        if (cancelled) return;

        const owned = new Set([
          ...library.watchlist.map((item) => keyFor(item)),
          ...library.watched.map((item) => keyFor(item)),
        ]);

        const filtered = uniqueMediaItems(recs.results || [], tmdbType)
          .filter((entry) => entry.id !== tmdbId)
          .filter((entry) => {
            const type: MediaType = entry.media_type || (entry.first_air_date ? "tv" : "movie");
            return !owned.has(keyFor({ id: entry.id, mediaType: type }));
          })
          .slice(0, 12);

        setBecauseYouWatchedTitle(displayTitle);
        setBecauseYouWatchedItems(toRowItems(filtered, tmdbType, { badge: "Because You Watched" }));
      } catch {
        if (!cancelled) {
          setBecauseYouWatchedTitle(seed.title);
          setBecauseYouWatchedItems([]);
        }
      }
    };

    loadBecauseYouWatched();
    return () => {
      cancelled = true;
    };
  }, [dailyRecommendationSeed, library.watchlist, library.watched, toRowItems]);

  const ensureItem = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType): LibraryItem => {
    if ("mediaType" in item) return item;
    return normalizeMedia(item, mediaType);
  }, []);

  const toggleWatchlist = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const exists = prev.watchlist.some((x) => keyFor(x) === k);
      return {
        ...prev,
        watchlist: exists ? prev.watchlist.filter((x) => keyFor(x) !== k) : [normalized, ...prev.watchlist],
      };
    });
  }, [ensureItem]);

  const toggleWatched = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const exists = prev.watched.some((x) => keyFor(x) === k);
      return {
        ...prev,
        watched: exists ? prev.watched.filter((x) => keyFor(x) !== k) : [normalized, ...prev.watched],
      };
    });
  }, [ensureItem]);

  const openDetail = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    setSelectedItem(item);
    setSelectedType(mediaType);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedItem(null);
    setSelectedType(null);
  }, []);

const openWatch = useCallback((payload: {
  url: string;
  title: string;
  mediaType: MediaType;
  tmdbId?: number;
  season?: number;
  episode?: number;
}) => {
  setWatchPayload(payload);
}, []);

  const closeWatch = useCallback(() => {
    setWatchPayload(null);
  }, []);

  const setRating = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType, rating: number) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => ({
      ...prev,
      watchlist: prev.watchlist.some((x) => keyFor(x) === k) ? prev.watchlist : [normalized, ...prev.watchlist],
      ratings: { ...prev.ratings, [k]: rating },
    }));
  }, [ensureItem]);

  const setWatchingSeason = useCallback((showId: number, season: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)];
      const watchedEpisodesBySeason = current?.watchedEpisodesBySeason || {};
      const selectedEpisodeBySeason = current?.selectedEpisodeBySeason || {};
      const firstTrackedEpisode = watchedEpisodesBySeason[String(season)]?.[0] || 1;

      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            season,
            episodeFilter: current?.episodeFilter || "all",
            watchedEpisodesBySeason,
            selectedEpisodeBySeason: {
              ...selectedEpisodeBySeason,
              [String(season)]: selectedEpisodeBySeason[String(season)] || firstTrackedEpisode,
            },
          },
        },
      };
    });
  }, []);

  const setEpisodeFilter = useCallback((showId: number, filter: "all" | "watched" | "unwatched") => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            episodeFilter: filter,
          },
        },
      };
    });
  }, []);

  const setCurrentEpisode = useCallback((showId: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(current.season || 1);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: episode,
            },
          },
        },
      };
    });
  }, []);

  const continueToNextEpisode = useCallback((showId: number, season: number, episodeNumbers: number[]) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const watched = new Set(current.watchedEpisodesBySeason[seasonKey] || []);
      const nextEpisode = episodeNumbers.find((ep) => !watched.has(ep)) || episodeNumbers[episodeNumbers.length - 1] || 1;
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: nextEpisode,
            },
          },
        },
      };
    });
  }, []);


  const toggleEpisode = useCallback((showId: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(current.season || 1);
      const currentSeasonEpisodes = current.watchedEpisodesBySeason[seasonKey] || [];
      const exists = currentSeasonEpisodes.includes(episode);
      const nextSeasonEpisodes = exists
        ? currentSeasonEpisodes.filter((x) => x !== episode)
        : [...currentSeasonEpisodes, episode].sort((a, b) => a - b);

      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: nextSeasonEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const markEpisodesUpTo = useCallback((showId: number, season: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const nextSeasonEpisodes = Array.from({ length: Math.max(episode - 1, 0) }, (_, i) => i + 1);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: episode,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: nextSeasonEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const markSeasonComplete = useCallback((showId: number, season: number, episodeNumbers: number[]) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const normalizedEpisodes = normalizeEpisodeNumbers(episodeNumbers);
      const lastEpisode = normalizedEpisodes[normalizedEpisodes.length - 1] || 1;
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: lastEpisode,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: normalizedEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const clearSeasonEpisodes = useCallback((showId: number, season: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: 1,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: [],
            },
          },
        },
      };
    });
  }, []);

  const resolveLibraryItemToTMDB = useCallback((oldItem: LibraryItem, resolved: MediaItem, mediaType: MediaType) => {
    const normalized = normalizeMedia(resolved, mediaType);
    const oldKey = keyFor(oldItem);
    const newKey = keyFor(normalized);

    setLibrary((prev) => {
      const replaceItem = (items: LibraryItem[]) =>
        dedupeLibraryItems(
          items.map((entry) => (keyFor(entry) === oldKey ? { ...normalized } : entry))
        );

      const nextRatings = { ...prev.ratings };
      if (oldKey !== newKey && typeof nextRatings[oldKey] === "number") {
        nextRatings[newKey] = nextRatings[oldKey];
        delete nextRatings[oldKey];
      }

      const nextWatching = { ...prev.watching };
      if (mediaType === "tv") {
        const oldWatching = nextWatching[String(oldItem.id)];
        if (oldWatching) {
          nextWatching[String(normalized.id)] = oldWatching;
          if (String(normalized.id) !== String(oldItem.id)) delete nextWatching[String(oldItem.id)];
        }
      }

      return {
        ...prev,
        watchlist: replaceItem(prev.watchlist),
        watched: replaceItem(prev.watched),
        ratings: nextRatings,
        watching: nextWatching,
      };
    });

    setSelectedItem((prev) => {
      if (!prev || !("mediaType" in prev)) return prev;
      return keyFor(prev) === oldKey ? normalized : prev;
    });
  }, []);

  const bulkLinkLibraryToTMDB = useCallback(async () => {
    if (bulkLinking) return;
    const uniqueItems = dedupeLibraryItems([...library.watchlist, ...library.watched]);
    if (!uniqueItems.length) {
      window.alert("No library items to link.");
      return;
    }

    setBulkLinking(true);
    try {
      const matches = await mapWithConcurrency(uniqueItems, 4, async (item) => {
        try {
          const match = await searchTMDBMatchForLibraryItem(item);
          return { oldItem: item, match };
        } catch {
          return { oldItem: item, match: null };
        }
      });

      const mapping = new Map<string, LibraryItem>();
      let linkedCount = 0;
      matches.forEach(({ oldItem, match }) => {
        if (!match) return;
        const normalized = normalizeMedia(match, oldItem.mediaType);
        mapping.set(keyFor(oldItem), normalized);
        if (normalized.id !== oldItem.id || normalized.title !== oldItem.title) linkedCount += 1;
      });

      setLibrary((prev) => {
        const replaceItems = (items: LibraryItem[]) =>
          dedupeLibraryItems(items.map((entry) => mapping.get(keyFor(entry)) || entry));

        const nextWatchlist = replaceItems(prev.watchlist);
        const nextWatched = replaceItems(prev.watched);
        const nextRatings: Record<string, number> = {};
        Object.entries(prev.ratings).forEach(([oldKey, value]) => {
          const original = [...prev.watchlist, ...prev.watched].find((entry) => keyFor(entry) === oldKey);
          if (!original) return;
          const replaced = mapping.get(oldKey) || original;
          nextRatings[keyFor(replaced)] = value;
        });

        const nextWatching: WatchingProgress = {};
        Object.entries(prev.watching).forEach(([showId, progress]) => {
          const original = [...prev.watchlist, ...prev.watched].find((entry) => entry.mediaType === "tv" && String(entry.id) === String(showId));
          if (!original) {
            nextWatching[showId] = progress;
            return;
          }
          const replaced = mapping.get(keyFor(original)) || original;
          nextWatching[String(replaced.id)] = progress;
        });

        return {
          ...prev,
          watchlist: nextWatchlist,
          watched: nextWatched,
          ratings: nextRatings,
          watching: nextWatching,
        };
      });

      window.alert(`Bulk link finished. ${linkedCount} items matched to TMDB.`);
    } finally {
      setBulkLinking(false);
    }
  }, [library, bulkLinking]);

  const exportLibrary = useCallback(() => {
    const payload: ImportExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      library: sanitizeLibrary(library),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = `goodfilm_library_${new Date().toISOString().slice(0, 10)}.json`;

    // Try modern File System API first (most reliable)
    if (typeof (window as any).showSaveFilePicker === "function") {
      (async () => {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: "JSON file", accept: { "application/json": [".json"] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch {
          // user cancelled or API unavailable — fall through
        }
      })();
      return;
    }

    // Fallback: anchor click method
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      // Last resort: open JSON in new tab so user can save manually
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }, [library]);

  const importLibrary = useCallback(async (file: File) => {
    try {
      const rawText = (await file.text()).trim();
      if (!rawText) {
        window.alert("The selected file is empty.");
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = JSON.parse(rawText.replace(/^﻿/, ""));
      }

      const candidates = [
        parsed?.library,
        parsed?.data?.library,
        parsed?.data,
        parsed?.goodfilm,
        parsed,
      ].filter(Boolean);

      let sanitized: UserLibrary | null = null;
      for (const candidate of candidates) {
        const next = sanitizeLibrary(candidate);
        const totalItems = next.watchlist.length + next.watched.length + Object.keys(next.watching).length + Object.keys(next.ratings).length;
        if (totalItems > 0) {
          sanitized = next;
          break;
        }
      }

      if (!sanitized) {
        window.alert("Import failed: no valid GoodFilm data was found in that file.");
        return;
      }

      setLibrary(() => sanitized as UserLibrary);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      localStorage.setItem(BACKUP_KEY, JSON.stringify(sanitized));

      if (currentUser) {
        try {
          await uploadLibraryToCloud(currentUser, sanitized);
        } catch {
          window.alert("Imported locally, but cloud sync failed. Check your Supabase connection and policies.");
        }
      }

      window.alert(`Library imported successfully. ${sanitized.watchlist.length} watchlist, ${sanitized.watched.length} watched, ${Object.keys(sanitized.watching).length} series in progress.`);
    } catch {
      window.alert("Invalid JSON file. Export a library from GoodFilm first, or use a compatible JSON structure.");
    }
  }, [currentUser]);

    const selectedKey = selectedItem && selectedType ? keyFor({ id: selectedItem.id, mediaType: selectedType }) : null;

  return (
    <AppShell>
      <TopPillNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
        onOpenProfile={(anchorTop?: number) => {
          if (anchorTop !== undefined) setSettingsAnchorTop(anchorTop);
          if (currentUser) setSettingsOpen(true);
          else {
            setAuthMode("login");
            setAuthOpen(true);
          }
        }}
        appLanguage={appLanguage}
        searchResults={searchResults}
        searchLoading={searchLoading}
        searchError={searchError}
        onOpenResult={openDetail}
      />
<SettingsPanel
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  onImport={importLibrary}
  onExport={exportLibrary}
  currentUser={currentUser}
  anchorTop={settingsAnchorTop}
  onOpenAuth={(mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  }}
  onOpenProfile={() => setProfileOpen(true)}
  onLogout={() => {
    if (currentUser?.provider === "supabase" && supabase) supabase.auth.signOut();
    setCurrentUser(null);
    setUserProfile(null);
    cloudSyncReady.current = false;
    isFirstRender.current = true;
    setProfileOpen(false);
  }}
  cloudMode={
    hasSupabase
      ? (cloudTableUnavailable
          ? "missing_table"
          : currentUser?.provider === "supabase"
            ? "ready"
            : "unknown")
      : "disabled"
  }
/>
      <AuthModal open={authOpen} mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSuccess={async (user, mode, profile) => {
          // Reset sync state before pulling cloud data
          cloudSyncReady.current = false;
          isFirstRender.current = false;
          setCurrentUser(user);
          if (profile) setUserProfile(profile);
          if (user.provider === "supabase") {
            try {
              const cloudRow = await downloadLibraryFromCloud(user);
              if (cloudRow?.library) {
                setLibrary(cloudRow.library);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudRow.library));
                localStorage.setItem(BACKUP_KEY, JSON.stringify(cloudRow.library));
              }
            } catch {
              window.alert("Cloud sync failed. Check your Supabase connection and policies.");
            } finally {
              cloudSyncReady.current = true;
            }
          }
        }} />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={currentUser}
        profile={userProfile}
        library={library}
        onUpdateProfile={(updates) => {
          if (!currentUser || !userProfile) return;
          const nextProfile = { ...userProfile, ...updates };
          setUserProfile(nextProfile);
          saveUserProfile(currentUser.email, nextProfile);
        }}
        onLogout={() => {
          if (currentUser?.provider === "supabase" && supabase) supabase.auth.signOut();
          setCurrentUser(null);
          setUserProfile(null);
          cloudSyncReady.current = false;
          isFirstRender.current = true;
          setProfileOpen(false);
        }}
      />
      <main className="mx-auto max-w-[1400px] px-6 pb-16 lg:px-10 xl:px-14" style={{ scrollBehavior: "smooth" }}>
        {(() => {
          if (activeTab === "home") {
            return (
              <>
                <Hero items={trendingMovies} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                <div className="mt-12">
                  {homeError ? <EmptyState title="TMDB connection failed" body={homeError} /> : null}
                  {continueWatchingItems.length ? (
                    <ContentRow
                      title="Continue Watching"
                      items={continueWatchingItems}
                      onOpen={(rowItem) => {
                        if (rowItem.sourceItem) openDetail(rowItem.sourceItem, rowItem.mediaType);
                      }}
                      variant="continue"
                      onRemoveContinue={(rowItem) => {
                        setLibrary((prev) => {
                          const nextWatching = { ...prev.watching };
                          delete nextWatching[String(rowItem.id)];
                          return { ...prev, watching: nextWatching };
                        });
                      }}
                    />
                  ) : null}
                  {becauseYouWatchedItems.length && becauseYouWatchedTitle ? (
                    <ContentRow
                      title={`Because You Watched “${becauseYouWatchedTitle}”`}
                      items={becauseYouWatchedItems}
                      onOpen={(rowItem) => {
                        if (rowItem.sourceItem) openDetail(rowItem.sourceItem, rowItem.mediaType);
                      }}
                    />
                  ) : null}
                  {homeRows.map((row) => (
                    <Rail
                      key={row.title}
                      title={row.title}
                      items={row.items}
                      mediaType={row.mediaType}
                      onOpen={openDetail}
                      onToggleWatchlist={toggleWatchlist}
                      onToggleWatched={toggleWatched}
                      watchlistKeys={watchlistKeys}
                      watchedKeys={watchedKeys}
                      ratings={library.ratings}
                    />
                  ))}
                </div>
              </>
            );
          }

          if (activeTab === "movies") {
            return (
              <>
                <Hero items={popularMovies} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                <div className="mt-12 space-y-0">
                  {movieRows.map((row) => (
                    <Rail
                      key={row.title}
                      title={row.title}
                      items={row.items}
                      mediaType={row.mediaType}
                      onOpen={openDetail}
                      onToggleWatchlist={toggleWatchlist}
                      onToggleWatched={toggleWatched}
                      watchlistKeys={watchlistKeys}
                      watchedKeys={watchedKeys}
                      ratings={library.ratings}
                    />
                  ))}
                </div>
              </>
            );
          }

          if (activeTab === "series") {
            return (
              <>
                <Hero items={popularSeries} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                <div className="mt-9 space-y-0">
                  {seriesRows.map((row) => (
                    <Rail
                      key={row.title}
                      title={row.title}
                      items={row.items}
                      mediaType={row.mediaType}
                      onOpen={openDetail}
                      onToggleWatchlist={toggleWatchlist}
                      onToggleWatched={toggleWatched}
                      watchlistKeys={watchlistKeys}
                      watchedKeys={watchedKeys}
                      ratings={library.ratings}
                    />
                  ))}
                </div>
              </>
            );
          }

          if (activeTab === "watchlist") {
            return (
              <WatchlistTabView
                library={library}
                watchlistKeys={watchlistKeys}
                watchedKeys={watchedKeys}
                onOpen={openDetail}
                onToggleWatchlist={toggleWatchlist}
                onToggleWatched={toggleWatched}
                onBack={() => setActiveTab("mylist")}
                appLanguage={appLanguage}
              />
            );
          }

          if (activeTab === "watched") {
            return (
              <WatchedTabView
                library={library}
                watchlistKeys={watchlistKeys}
                watchedKeys={watchedKeys}
                onOpen={openDetail}
                onToggleWatchlist={toggleWatchlist}
                onToggleWatched={toggleWatched}
                onBack={() => setActiveTab("mylist")}
                appLanguage={appLanguage}
              />
            );
          }

          return (
            <MyListView
              library={library}
              watchlistKeys={watchlistKeys}
              watchedKeys={watchedKeys}
              onOpen={openDetail}
              onToggleWatchlist={toggleWatchlist}
              onToggleWatched={toggleWatched}
              onExport={exportLibrary}
              onImport={importLibrary}
              onNavigateTab={setActiveTab}
              onBulkLinkTMDB={bulkLinkLibraryToTMDB}
              bulkLinking={bulkLinking}
              appLanguage={appLanguage}
            />
          );
        })()}
      </main>

      <DetailModal
        open={Boolean(selectedItem && selectedType)}
        item={selectedItem}
        mediaType={selectedType}
        onClose={closeDetail}
        inWatchlist={selectedKey ? watchlistKeys.has(selectedKey) : false}
        inWatched={selectedKey ? watchedKeys.has(selectedKey) : false}
        userRating={selectedKey ? library.ratings[selectedKey] : undefined}
        onToggleWatchlist={() => selectedItem && selectedType && toggleWatchlist(selectedItem, selectedType)}
        onToggleWatched={() => selectedItem && selectedType && toggleWatched(selectedItem, selectedType)}
        onRate={(rating) => selectedItem && selectedType && setRating(selectedItem, selectedType, rating)}
        library={library}
        setWatchingSeason={setWatchingSeason}
        toggleEpisode={toggleEpisode}
        setEpisodeFilter={setEpisodeFilter}
        setCurrentEpisode={setCurrentEpisode}
        continueToNextEpisode={continueToNextEpisode}
        markEpisodesUpTo={markEpisodesUpTo}
        markSeasonComplete={markSeasonComplete}
        clearSeasonEpisodes={clearSeasonEpisodes}
        onResolveLibraryItem={resolveLibraryItemToTMDB}
        onOpenRelated={openDetail}
        onToggleSimilarWatchlist={toggleWatchlist}
        onToggleSimilarWatched={toggleWatched}
        similarWatchlistKeys={watchlistKeys}
        similarWatchedKeys={watchedKeys}
        ratingsMap={library.ratings}
        appLanguage={appLanguage}
        onOpenWatch={openWatch}
        onSaveNote={(key, note) => setLibrary(prev => ({ ...prev, notes: { ...prev.notes, [key]: note } }))}
        userNote={selectedItem ? library.notes[keyFor({ id: selectedItem.id, mediaType: selectedType || ("mediaType" in selectedItem ? selectedItem.mediaType : "movie") })] : ""}
      />
      <WatchModal open={Boolean(watchPayload)} payload={watchPayload} onClose={closeWatch} />
    </AppShell>
  );
}
