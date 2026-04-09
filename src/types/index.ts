// ─────────────────────────────────────────────────────────────────────────────
// GoodFilm — Shared Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type Tab         = "home" | "movies" | "series" | "anime" | "mylist" | "lists" | "watchlist" | "watched" | "profile";
export type AuthMode    = "login" | "signup";
export type MediaType   = "movie" | "tv";
export type AppLanguage = "en";
export type CloudMode   = "unknown" | "ready" | "missing_table" | "disabled";

// ── Media / TMDB ─────────────────────────────────────────────────────────────

export type MediaItem = {
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

export type Genre      = { id: number; name: string };
export type SeasonInfo = { season_number: number; name: string; episode_count: number };

export type DetailData = {
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

export type IMDbTitleData = {
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

export type OmdbData = {
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
  Metascore?: string;
  BoxOffice?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Response?: string;
};

export type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

export type Episode = {
  id: number;
  episode_number: number;
  name: string;
  overview?: string | null;
  runtime?: number | null;
  air_date?: string | null;
  still_path?: string | null;
  vote_average?: number | null;
};

export type VideoResult = {
  id: string;
  key: string;
  site: string;
  type: string;
};

// ── Custom Lists ──────────────────────────────────────────────────────────────

export type CustomListItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
};

export type CustomList = {
  id: string;
  name: string;
  createdAt: string;
  items: CustomListItem[];
};

// ── Library ───────────────────────────────────────────────────────────────────

export type LibraryItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  rating: number | null;
  genre_ids?: number[];
  genres?: Array<{ id: number }>;
};

export type WatchingProgress = {
  [showId: string]: {
    season: number;
    episodeFilter?: "all" | "watched" | "unwatched";
    selectedEpisodeBySeason: Record<string, number>;
    watchedEpisodesBySeason: Record<string, number[]>;
  };
};

export type UserLibrary = {
  watchlist:     LibraryItem[];
  watchingItems: LibraryItem[];
  waitingItems:  LibraryItem[];
  watched:       LibraryItem[];
  ratings:       Record<string, number>;
  watching:      WatchingProgress;
  notes:         Record<string, string>;
  customLists:   CustomList[];
};

export const defaultLibrary: UserLibrary = {
  watchlist:     [],
  watchingItems: [],
  waitingItems:  [],
  watched:       [],
  ratings:       {},
  watching:      {},
  notes:         {},
  customLists:   [],
};

export type ImportExportPayload = {
  version: 1;
  exportedAt: string;
  library: UserLibrary;
};

// ── Auth / User ───────────────────────────────────────────────────────────────

export type CloudUser = {
  id: string;
  email: string;
  provider: "supabase";
};

export type CloudLibraryRow = {
  library:    UserLibrary;
  updated_at?: string | null;
};

// ── Profile ───────────────────────────────────────────────────────────────────

export type Visibility         = "public" | "friends" | "private";
export type ProfileViewerRole  = "owner" | "friend" | "stranger";
export type ProfileTabKey      = "watched" | "watchlist" | "lists" | "activity";

export type ProfilePrivacy = {
  recommendations: Visibility;
  watched:         Visibility;
  watchlist:       Visibility;
  lists:           Visibility;
  friends:         Visibility;
  activity:        Visibility;
  profileInfo:     Visibility;
};

export const DEFAULT_PRIVACY: ProfilePrivacy = {
  recommendations: "public",
  watched:         "public",
  watchlist:       "friends",
  lists:           "public",
  friends:         "public",
  activity:        "friends",
  profileInfo:     "public",
};

export type UserProfile = {
  username:    string;
  avatarUrl:   string | null;
  memberSince: string;
  lastLogin:   string;
  bio?:        string;
  privacy?:    ProfilePrivacy;
};

// ── Supabase ──────────────────────────────────────────────────────────────────

export type SupabaseRuntimeError = {
  code?:    string;
  message?: string;
  details?: string | null;
  hint?:    string | null;
};
