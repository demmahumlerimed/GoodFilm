/**
 * GoodFilm — Media Enrichment Service (Phase 2)
 *
 * Unifies a "rich" metadata record for a movie/series by combining:
 *   1. TMDb /movie|tv/{id} with append_to_response=credits,external_ids,keywords,
 *      videos,images,recommendations,similar,release_dates,content_ratings
 *   2. OMDb lookup by imdb_id (external_ids.imdb_id) for longer plot text,
 *      Metacritic / Rotten Tomatoes ratings, awards, and an IMDb rating cross-check.
 *
 * Goal: produce a single `EnrichedMedia` object the UI can render without
 * worrying about which source supplied which field. Missing sources degrade
 * gracefully — TMDb remains the required primary.
 *
 * NOTE (ADR-style): imdb-api.com (the commercial service at that domain) was
 * shut down in Oct 2023; we intentionally do NOT integrate it. Instead we use
 * OMDb (already wired via `./omdb`) as the IMDb-flavored supplement, which is
 * stable and well-documented.
 */

import { tmdbFetch } from "./tmdb";
import { omdbFetch } from "./omdb";
import type { MediaType } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Genre = { id: number; name: string };

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order?: number;
};

export type CrewMember = {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
};

export type Keyword = { id: number; name: string };

export type VideoClip = {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
};

export type ExternalIds = {
  imdb_id?: string | null;
  wikidata_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
};

export type EnrichedMedia = {
  // Core TMDb fields
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  tagline: string | null;
  overview: string; // TMDb short synopsis

  // Enhanced synopsis (best-of OMDb Plot | TMDb overview)
  richPlot: string;

  posterPath: string | null;
  backdropPath: string | null;

  releaseDate: string | null; // ISO date
  year: string | null;
  runtime: number | null; // minutes (movies); first episode runtime for TV
  genres: Genre[];
  keywords: Keyword[];

  voteAverage: number; // TMDb
  voteCount: number;

  // Series-only
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  status: string | null;

  // People
  cast: CastMember[]; // full credit list
  topCast: CastMember[]; // first 12 billed, deduped
  director: string | null;
  writers: string[];
  creators: string[]; // TV only

  // External ratings
  imdbId: string | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  rottenTomatoes: string | null; // e.g. "95%"
  metacritic: string | null; // e.g. "81/100"
  awards: string | null;

  // Media
  videos: VideoClip[];
  bestTrailerKey: string | null;

  // Discovery
  recommendations: Array<{ id: number; media_type?: string; title?: string; name?: string; poster_path?: string | null }>;

  // Raw sources (for debug / further mapping)
  _tmdb: unknown;
  _omdb: unknown;
};

// ── Internal TMDb shape (partial) ─────────────────────────────────────────────

type TMDbDetailRaw = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  tagline?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: Genre[];
  status?: string;
  vote_average?: number;
  vote_count?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: Array<{ id: number; name: string }>;
  credits?: { cast?: CastMember[]; crew?: CrewMember[] };
  external_ids?: ExternalIds;
  keywords?: { keywords?: Keyword[]; results?: Keyword[] };
  videos?: { results?: VideoClip[] };
  recommendations?: { results?: EnrichedMedia["recommendations"] };
};

// ── Trailer picker ────────────────────────────────────────────────────────────

function pickBestTrailer(videos: VideoClip[]): VideoClip | null {
  if (!videos.length) return null;
  const score = (v: VideoClip) => {
    let s = 0;
    if (v.site === "YouTube") s += 100;
    if (v.type === "Trailer") s += 80;
    else if (v.type === "Teaser") s += 40;
    if (v.official) s += 30;
    if (/official.*trailer/i.test(v.name)) s += 20;
    return s;
  };
  return [...videos].sort((a, b) => score(b) - score(a))[0] || null;
}

// ── Cast dedup / sort ─────────────────────────────────────────────────────────

function normaliseCast(cast: CastMember[]): CastMember[] {
  const seen = new Set<number>();
  return cast
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return Boolean(c.name);
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

// ── OMDb parse helpers ────────────────────────────────────────────────────────

function parseOmdbRatings(omdb: unknown): { rt: string | null; mc: string | null } {
  const o = omdb as { Ratings?: Array<{ Source?: string; Value?: string }> } | null;
  if (!o?.Ratings) return { rt: null, mc: null };
  const rt =
    o.Ratings.find((r) => r.Source === "Rotten Tomatoes")?.Value || null;
  const mc =
    o.Ratings.find((r) => r.Source === "Metacritic")?.Value || null;
  return { rt, mc };
}

function pickRichPlot(tmdbOverview: string, omdb: unknown): string {
  const o = omdb as { Plot?: string } | null;
  const omdbPlot = o?.Plot && o.Plot !== "N/A" ? o.Plot : "";
  // Prefer the longer, more descriptive string
  if (omdbPlot.length > tmdbOverview.length + 40) return omdbPlot;
  return tmdbOverview || omdbPlot || "";
}

// ── Main enrichment call ──────────────────────────────────────────────────────

const APPEND =
  "credits,external_ids,keywords,videos,recommendations,images,release_dates,content_ratings";

/**
 * Fetch a fully enriched media record.
 *
 * @throws if TMDb primary fetch fails (OMDb failures are non-fatal).
 */
export async function fetchEnrichedMedia(
  mediaType: MediaType,
  id: number | string
): Promise<EnrichedMedia> {
  const tmdbPath = mediaType === "movie" ? `/movie/${id}` : `/tv/${id}`;
  const raw = await tmdbFetch<TMDbDetailRaw>(tmdbPath, {
    append_to_response: APPEND,
  });

  const imdbId = raw.external_ids?.imdb_id || null;

  // OMDb supplement — best effort, non-fatal
  let omdb: unknown = null;
  if (imdbId) {
    try {
      omdb = await omdbFetch({ i: imdbId, plot: "full" });
    } catch {
      omdb = null;
    }
  }

  const overview = raw.overview || "";
  const richPlot = pickRichPlot(overview, omdb);
  const { rt, mc } = parseOmdbRatings(omdb);

  const cast = normaliseCast(raw.credits?.cast || []);
  const crew = raw.credits?.crew || [];

  const director =
    crew.find((c) => c.job === "Director")?.name ||
    crew.find((c) => c.department === "Directing")?.name ||
    null;

  const writers = Array.from(
    new Set(
      crew
        .filter(
          (c) =>
            c.department === "Writing" ||
            ["Screenplay", "Writer", "Story"].includes(c.job)
        )
        .map((c) => c.name)
    )
  ).slice(0, 4);

  const creators = (raw.created_by || []).map((c) => c.name);

  const keywords = raw.keywords?.keywords || raw.keywords?.results || [];
  const videos = raw.videos?.results || [];
  const trailer = pickBestTrailer(videos);

  const releaseDate = raw.release_date || raw.first_air_date || null;
  const year = releaseDate ? releaseDate.slice(0, 4) : null;

  const omdbAny = omdb as
    | { imdbRating?: string; imdbVotes?: string; Awards?: string }
    | null;
  const imdbRating = omdbAny?.imdbRating
    ? parseFloat(omdbAny.imdbRating)
    : null;
  const imdbVotes = omdbAny?.imdbVotes
    ? parseInt(omdbAny.imdbVotes.replace(/,/g, ""), 10)
    : null;

  return {
    id: raw.id,
    mediaType,
    title: raw.title || raw.name || "Unknown",
    originalTitle: raw.original_title || raw.original_name || "",
    tagline: raw.tagline || null,
    overview,
    richPlot,
    posterPath: raw.poster_path || null,
    backdropPath: raw.backdrop_path || null,
    releaseDate,
    year,
    runtime: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
    genres: raw.genres || [],
    keywords,
    voteAverage: raw.vote_average || 0,
    voteCount: raw.vote_count || 0,
    numberOfSeasons: raw.number_of_seasons ?? null,
    numberOfEpisodes: raw.number_of_episodes ?? null,
    status: raw.status || null,
    cast,
    topCast: cast.slice(0, 12),
    director,
    writers,
    creators,
    imdbId,
    imdbRating: Number.isFinite(imdbRating) ? imdbRating : null,
    imdbVotes: Number.isFinite(imdbVotes) ? imdbVotes : null,
    rottenTomatoes: rt,
    metacritic: mc,
    awards: omdbAny?.Awards && omdbAny.Awards !== "N/A" ? omdbAny.Awards : null,
    videos,
    bestTrailerKey: trailer?.key || null,
    recommendations: raw.recommendations?.results || [],
    _tmdb: raw,
    _omdb: omdb,
  };
}
