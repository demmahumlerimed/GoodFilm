import type {
  MediaItem, DetailData, LibraryItem, MediaType,
  UserLibrary, WatchingProgress,
} from "../types";
import { defaultLibrary } from "../types";

// ── Key helpers ───────────────────────────────────────────────────────────────

export function getTitle(item: Partial<MediaItem | DetailData>): string {
  return item.title || item.name || "Untitled";
}

export function getYear(item: Partial<MediaItem | DetailData>): string {
  const raw = item.release_date || item.first_air_date;
  return raw ? raw.slice(0, 4) : "—";
}

export function keyFor(item: { id: number; mediaType: MediaType }): string {
  return `${item.mediaType}-${item.id}`;
}

// ── Normalization ─────────────────────────────────────────────────────────────

export function normalizeMedia(item: MediaItem, forcedType?: MediaType): LibraryItem {
  const mediaType = forcedType || item.media_type || (item.first_air_date ? "tv" : "movie");
  return {
    id:           item.id,
    mediaType,
    title:        getTitle(item),
    posterPath:   item.poster_path   ?? null,
    backdropPath: item.backdrop_path ?? null,
    year:         getYear(item),
    rating:       item.vote_average  ?? null,
    ...(item.genre_ids ? { genre_ids: item.genre_ids } : {}),
  };
}

function buildSyntheticLibraryId(item: Record<string, unknown>): number {
  const seed = `${item?.title || item?.name || "untitled"}-${item?.year || item?.release_date || item?.first_air_date || "0"}-${item?.mediaType || item?.media_type || item?.listType || "movie"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + 1;
}

export function dedupeLibraryItems(items: unknown[]): LibraryItem[] {
  const map = new Map<string, LibraryItem>();

  items.forEach((item: any) => {
    if (!item) return;

    const rawId  = typeof item.id === "number" ? item.id : Number(item.id);
    const safeId = Number.isNaN(rawId) ? buildSyntheticLibraryId(item) : rawId;

    const mediaType: MediaType =
      item.mediaType === "tv" ||
      item.media_type === "tv" ||
      item.first_air_date ||
      item.type === "series" ||
      item.type === "tv" ||
      item.category === "series"
        ? "tv" : "movie";

    const normalized: LibraryItem = {
      id:          safeId,
      mediaType,
      title:       item.title || item.name || "Untitled",
      posterPath:  item.posterPath ?? item.poster_path ?? item.posterUrl ?? null,
      backdropPath: item.backdropPath ?? item.backdrop_path ?? null,
      year:        String(item.year || getYear(item) || "—"),
      rating:
        typeof item.userRating   === "number" ? item.userRating   :
        typeof item.rating       === "number" ? item.rating       :
        typeof item.vote_average === "number" ? item.vote_average :
        typeof item.imdbRating   === "number" ? item.imdbRating   :
        null,
      ...(Array.isArray(item.genre_ids) ? { genre_ids: item.genre_ids } : {}),
      ...(Array.isArray(item.genres)    ? { genres:    (item.genres as any[]).map((g: any) => ({ id: g.id })) } : {}),
    };

    map.set(keyFor(normalized), normalized);
  });

  return Array.from(map.values());
}

export function uniqueMediaItems(items: MediaItem[], fallbackType?: MediaType): MediaItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const mediaType = item.media_type || (item.first_air_date ? "tv" : fallbackType || "movie");
    const k = keyFor({ id: item.id, mediaType });
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function uniqueRowDefinitions<T extends { id: number; media_type?: MediaType; first_air_date?: string }>(
  rows: Array<{ title: string; items: T[]; mediaType?: MediaType; largeCards?: boolean }>
) {
  const seen = new Set<string>();
  return rows
    .map(row => {
      const deduped = row.items.filter(item => {
        const mediaType = row.mediaType || item.media_type || (item.first_air_date ? "tv" : "movie");
        const k = keyFor({ id: item.id, mediaType });
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return { ...row, items: deduped };
    })
    .filter(row => row.items.length > 0);
}

// ── Episode normalization ─────────────────────────────────────────────────────

export function normalizeEpisodeNumbers(input: unknown): number[] {
  return Array.from(
    new Set(
      (Array.isArray(input) ? input : [])
        .filter((ep: any) => typeof ep === "number" && ep > 0)
        .map((ep: number) => Math.floor(ep))
    )
  ).sort((a, b) => a - b);
}

// ── Library sanitization ──────────────────────────────────────────────────────

export function sanitizeLibrary(input: unknown): UserLibrary {
  // Handle flat array imports (legacy format)
  if (Array.isArray(input)) {
    const importedItems = dedupeLibraryItems(input);
    const watched:   LibraryItem[] = [];
    const watchlist: LibraryItem[] = [];
    const ratings:   Record<string, number> = {};

    (input as any[]).forEach((raw, index) => {
      const normalized = importedItems[index] || dedupeLibraryItems([raw])[0];
      if (!normalized) return;
      const listType = raw?.listType === "watched" || raw?.listType === "favorites" ? "watched" : "watchlist";
      if (listType === "watched") watched.push(normalized);
      else watchlist.push(normalized);
      const r = raw?.userRating ?? raw?.rating ?? raw?.imdbRating;
      if (typeof r === "number") ratings[keyFor(normalized)] = r;
    });

    return { watchlist: dedupeLibraryItems(watchlist), watchingItems: [], waitingItems: [], watched: dedupeLibraryItems(watched), ratings, watching: {}, notes: {}, customLists: [], followedPeople: [], movieProgress: {} };
  }

  const src = input as any;

  const rawWatchlist = Array.isArray(src?.watchlist)       ? src.watchlist
    : Array.isArray(src?.movies?.watchlist)                ? src.movies.watchlist
    : Array.isArray(src?.movieWatchlist)                   ? src.movieWatchlist
    : Array.isArray(src?.list)                             ? src.list
    : [];

  const rawWatched = Array.isArray(src?.watched)           ? src.watched
    : Array.isArray(src?.movies?.watched)                  ? src.movies.watched
    : Array.isArray(src?.movieWatched)                     ? src.movieWatched
    : [];

  const rawSeriesWatchlist = Array.isArray(src?.seriesWatchlist) ? src.seriesWatchlist
    : Array.isArray(src?.tvWatchlist)                            ? src.tvWatchlist
    : [];

  const rawSeriesWatched = Array.isArray(src?.seriesWatched) ? src.seriesWatched
    : Array.isArray(src?.tvWatched)                          ? src.tvWatched
    : [];

  const watchlist = dedupeLibraryItems([...rawWatchlist, ...rawSeriesWatchlist]);
  const watched   = dedupeLibraryItems([...rawWatched,   ...rawSeriesWatched]);
  const rawWatchingItems = Array.isArray(src?.watchingItems) ? src.watchingItems : [];
  const watchingItems = dedupeLibraryItems(rawWatchingItems);
  const rawWaitingItems = Array.isArray(src?.waitingItems) ? src.waitingItems : [];
  const waitingItems = dedupeLibraryItems(rawWaitingItems);

  const ratingsSource =
    src?.ratings      && typeof src.ratings      === "object" ? src.ratings      :
    src?.movieRatings  && typeof src.movieRatings  === "object" ? src.movieRatings  :
    src?.userRatings   && typeof src.userRatings   === "object" ? src.userRatings   :
    {};

  const validKeys = new Set([...watchlist, ...watched].map(i => keyFor(i)));
  const ratings: Record<string, number> = Object.fromEntries(
    Object.entries(ratingsSource)
      .map(([k, v]) => [k, typeof v === "string" ? Number(v) : v] as const)
      .filter(([k, v]) => validKeys.has(k) && typeof v === "number" && !Number.isNaN(v) && v >= 0 && v <= 10)
  ) as Record<string, number>;

  const watchingSource =
    src?.watching       && typeof src.watching       === "object" ? src.watching       :
    src?.seriesProgress && typeof src.seriesProgress === "object" ? src.seriesProgress :
    src?.tvProgress     && typeof src.tvProgress     === "object" ? src.tvProgress     :
    {};

  const watching: WatchingProgress = {};
  Object.entries(watchingSource).forEach(([showId, value]: [string, any]) => {
    const numericId = Number(showId);
    const safeShowId = Number.isNaN(numericId) ? buildSyntheticLibraryId({ title: showId, mediaType: "tv" }) : numericId;
    const season = typeof value?.season === "number" && value.season > 0 ? Math.floor(value.season) : 1;

    const watchedEpisodesBySeason: Record<string, number[]> = {};
    if (value?.watchedEpisodesBySeason && typeof value.watchedEpisodesBySeason === "object") {
      Object.entries(value.watchedEpisodesBySeason).forEach(([sk, eps]) => {
        watchedEpisodesBySeason[String(sk)] = normalizeEpisodeNumbers(eps);
      });
    } else {
      const legacyEps = Array.isArray(value?.watchedEpisodes) ? value.watchedEpisodes
        : Array.isArray(value?.episodes) ? value.episodes : [];
      watchedEpisodesBySeason[String(season)] = normalizeEpisodeNumbers(legacyEps);
    }

    const selectedEpisodeBySeason: Record<string, number> = {};
    if (value?.selectedEpisodeBySeason && typeof value.selectedEpisodeBySeason === "object") {
      Object.entries(value.selectedEpisodeBySeason).forEach(([sk, ep]) => {
        selectedEpisodeBySeason[String(sk)] = typeof ep === "number" && ep > 0 ? Math.floor(ep) : 1;
      });
    } else {
      const legacySel = typeof value?.selectedEpisode === "number" && value.selectedEpisode > 0
        ? Math.floor(value.selectedEpisode)
        : watchedEpisodesBySeason[String(season)]?.[0] || 1;
      selectedEpisodeBySeason[String(season)] = legacySel;
    }

    const episodeFilter: "all" | "watched" | "unwatched" =
      value?.episodeFilter === "watched" || value?.episodeFilter === "unwatched"
        ? value.episodeFilter : "all";

    const lastWatchedAt = typeof value?.lastWatchedAt === "number" ? value.lastWatchedAt : undefined;
    watching[String(safeShowId)] = { season, episodeFilter, selectedEpisodeBySeason, watchedEpisodesBySeason, ...(lastWatchedAt ? { lastWatchedAt } : {}) };
  });

  const notes: Record<string, string> = {};
  if (src?.notes && typeof src.notes === "object") {
    Object.entries(src.notes).forEach(([k, v]) => { if (typeof v === "string") notes[k] = v; });
  }

  const customLists = Array.isArray(src?.customLists) ? src.customLists : [];
  const followedPeople = Array.isArray(src?.followedPeople) ? src.followedPeople : [];

  // Migrate movieProgress — validate each entry has required numeric fields
  const movieProgress: Record<string, import("../types").MovieWatchEntry> = {};
  if (src?.movieProgress && typeof src.movieProgress === "object") {
    Object.entries(src.movieProgress).forEach(([k, v]: [string, any]) => {
      if (
        typeof v?.tmdbId === "number" &&
        typeof v?.title === "string" &&
        typeof v?.startedAt === "number" &&
        typeof v?.lastWatchedAt === "number"
      ) {
        movieProgress[k] = { tmdbId: v.tmdbId, title: v.title, startedAt: v.startedAt, lastWatchedAt: v.lastWatchedAt };
      }
    });
  }

  return { watchlist, watchingItems, waitingItems, watched, ratings, watching, notes, customLists, followedPeople, movieProgress };
}

// ── Library score & merge ─────────────────────────────────────────────────────

/**
 * Numeric score to compare library richness.
 * Used for conflict resolution when merging local vs cloud data.
 */
export function libraryScore(library: UserLibrary): number {
  return (
    library.watchlist.length   * 2 +
    library.watched.length     * 2 +
    (library.watchingItems || []).length * 2 +
    (library.waitingItems  || []).length * 2 +
    Object.keys(library.ratings).length +
    Object.keys(library.watching).length * 3
  );
}

/**
 * Merge two libraries. Primary wins on per-key conflicts.
 * Items from both are merged and de-duplicated.
 */
export function mergeLibraries(primary: UserLibrary, secondary: UserLibrary): UserLibrary {
  const watchingItems = dedupeLibraryItems([...(primary.watchingItems || []), ...(secondary.watchingItems || [])]);
  const waitingItems  = dedupeLibraryItems([...(primary.waitingItems  || []), ...(secondary.waitingItems  || [])]);
  return {
    watchlist:    dedupeLibraryItems([...primary.watchlist, ...secondary.watchlist]),
    watchingItems,
    waitingItems,
    watched:      dedupeLibraryItems([...primary.watched,   ...secondary.watched]),
    ratings:      { ...secondary.ratings,  ...primary.ratings  },
    watching:     { ...secondary.watching, ...primary.watching },
    notes:        { ...secondary.notes,    ...primary.notes    },
    customLists:  [...(secondary.customLists ?? []), ...(primary.customLists ?? [])],
    followedPeople: (() => {
      const seen = new Set<number>();
      return [...(primary.followedPeople ?? []), ...(secondary.followedPeople ?? [])].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    })(),
    // Merge movie progress: secondary provides base, primary wins on conflicts
    movieProgress: { ...(secondary.movieProgress ?? {}), ...(primary.movieProgress ?? {}) },
  };
}

// ── Concurrency helper ────────────────────────────────────────────────────────

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, runWorker));
  return results;
}
