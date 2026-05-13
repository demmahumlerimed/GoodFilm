import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Film, ArrowLeft, Star, Play, Plus, X, Cloud, ExternalLink, Eye, Home, Tv, Wand2, LayoutList, Search, Check, BookmarkCheck } from "lucide-react";
import { fetchEnrichedMedia, type EnrichedMedia } from "../services/mediaEnrichment";
import { POSTER_BASE, BACKDROP_BASE } from "../config";
import type { MediaItem, MediaType, LibraryItem } from "../types";
import { SERVERS, type ServerKey } from "../constants/servers";
import { PersonModal } from "../components/media/PersonModal";
import { loadLibrary, saveLibrary } from "../utils/storage";

// ── Types ─────────────────────────────────────────────────────────────────────

type Genre = { id: number; name: string };

type DetailData = {
  id: number; title?: string; name?: string;
  overview: string; poster_path: string | null; backdrop_path: string | null;
  vote_average: number; vote_count: number;
  release_date?: string; first_air_date?: string;
  runtime?: number; episode_run_time?: number[];
  genres: Genre[]; tagline?: string; status?: string;
  original_language?: string;
  number_of_seasons?: number; number_of_episodes?: number;
  production_companies?: Array<{ name: string; logo_path: string | null }>;
  credits?: { cast: Array<{ id: number; name: string; character: string; profile_path: string | null }> };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRuntime(m: number) {
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
function formatYear(d?: string) { return d ? d.slice(0, 4) : "—"; }

// ── Letterboxd-style star rating (1–5, half-star steps) ──────────────────────

function StarRatingPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-[2px]" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const full = display !== null && display >= i;
          const half = display !== null && !full && display >= i - 0.5;
          return (
            <div key={i} className="relative" style={{ width: 20, height: 20 }}>
              <Star
                size={18}
                fill="transparent"
                strokeWidth={1.5}
                style={{ color: "#3a3a3a", position: "absolute", inset: 1 }}
              />
              {(full || half) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 1,
                    clipPath: half ? "inset(0 50% 0 0)" : undefined,
                  }}
                >
                  <Star size={18} fill="#e8a020" strokeWidth={0} style={{ color: "#e8a020" }} />
                </div>
              )}
              <div
                className="absolute top-0 left-0 h-full cursor-pointer"
                style={{ width: "50%" }}
                onMouseEnter={() => setHover(i - 0.5)}
                onClick={() => onChange(value === i - 0.5 ? null : i - 0.5)}
              />
              <div
                className="absolute top-0 right-0 h-full cursor-pointer"
                style={{ width: "50%" }}
                onMouseEnter={() => setHover(i)}
                onClick={() => onChange(value === i ? null : i)}
              />
            </div>
          );
        })}
      </div>
      <span
        className="text-[11px] font-semibold tabular-nums"
        style={{ color: value !== null ? "#e8a020" : "#3a3a3a", minWidth: 24 }}
      >
        {value !== null
          ? Number.isInteger(value)
            ? `${value}.0`
            : `${Math.floor(value)}½`
          : "Rate"}
      </span>
    </div>
  );
}

// ── Cast card ─────────────────────────────────────────────────────────────────

function CastCard({
  name,
  role,
  profilePath,
  isCredit,
  onPersonClick,
}: {
  name: string;
  role: string;
  profilePath: string | null;
  isCredit?: boolean;
  onPersonClick?: () => void;
}) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const clickable = !!onPersonClick;

  return (
    <div
      onClick={onPersonClick}
      className={`group flex flex-col items-center gap-2.5 text-center shrink-0 ${clickable ? "cursor-pointer" : ""}`}
      style={{ width: 88 }}
    >
      <div
        className="w-[72px] h-[72px] rounded-full overflow-hidden shrink-0 transition-all duration-200 group-hover:scale-[1.06]"
        style={{
          border: isCredit
            ? "2px solid rgba(232,160,32,0.45)"
            : "1px solid rgba(255,255,255,0.09)",
          background: isCredit ? "rgba(232,160,32,0.05)" : "rgba(255,255,255,0.03)",
          boxShadow: isCredit ? "0 0 16px rgba(232,160,32,0.12)" : "none",
        }}
      >
        {profilePath ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${profilePath}`}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[13px] font-bold"
            style={{ color: isCredit ? "rgba(232,160,32,0.5)" : "rgba(255,255,255,0.18)" }}
          >
            {initials}
          </div>
        )}
      </div>
      <div>
        <p
          className="text-[11.5px] font-semibold leading-snug transition-colors duration-150 group-hover:text-white"
          style={{ color: "rgba(255,255,255,0.78)" }}
        >
          {name}
        </p>
        <p
          className="text-[10px] leading-snug mt-0.5"
          style={{
            color: isCredit ? "rgba(232,160,32,0.6)" : "#3d3d3d",
            fontStyle: isCredit ? "normal" : "italic",
            fontWeight: isCredit ? 600 : 400,
          }}
        >
          {role}
        </p>
      </div>
    </div>
  );
}

// ── Inline player ─────────────────────────────────────────────────────────────

function InlinePlayer({
  mediaType,
  tmdbId,
  season,
  episode,
  currentServer,
  onServerChange,
  onClose,
}: {
  mediaType: MediaType;
  tmdbId: string;
  season?: number;
  episode?: number;
  currentServer: ServerKey;
  onServerChange: (key: ServerKey) => void;
  onClose: () => void;
}) {
  const [serverPanelOpen, setServerPanelOpen] = useState(false);

  const server = SERVERS.find((s) => s.key === currentServer) ?? SERVERS[0];
  const url = server.buildUrl({ type: mediaType, tmdbId, season, episode });
  const shortLabel = server.label.replace(" — Default", "");

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl animate-fade-up"
      style={{
        paddingBottom: "56.25%",
        background: "#050505",
        boxShadow: "0 32px 96px rgba(0,0,0,0.9)",
      }}
    >
      <iframe
        key={url}
        src={url}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        style={{ border: "none" }}
      />

      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setServerPanelOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-3 py-[7px] transition-all"
          style={{
            background: serverPanelOpen ? "rgba(232,160,32,0.18)" : "rgba(0,0,0,0.78)",
            backdropFilter: "blur(16px)",
            border: serverPanelOpen
              ? "0.75px solid rgba(232,160,32,0.45)"
              : "0.75px solid rgba(255,255,255,0.13)",
            color: "#e8a020",
          }}
          title="Switch server"
        >
          <Cloud size={13} />
          <span
            className="text-[10px] font-semibold hidden sm:inline"
            style={{ color: serverPanelOpen ? "#e8a020" : "rgba(255,255,255,0.5)" }}
          >
            {shortLabel}
          </span>
        </button>

        <button
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          className="flex items-center justify-center w-[30px] h-[30px] rounded-full transition-all hover:bg-white/10"
          style={{
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(16px)",
            border: "0.75px solid rgba(255,255,255,0.13)",
            color: "rgba(255,255,255,0.45)",
          }}
          title="Open in new tab"
        >
          <ExternalLink size={11} />
        </button>
      </div>

      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/20"
        style={{ background: "rgba(0,0,0,0.72)", color: "#fff" }}
        aria-label="Close player"
      >
        <X size={14} />
      </button>

      {serverPanelOpen && (
        <div
          className="absolute top-0 left-0 z-10 h-full overflow-y-auto"
          style={{
            width: "min(280px, 60%)",
            background: "rgba(4,4,4,0.97)",
            backdropFilter: "blur(32px)",
            borderRight: "0.75px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "0.75px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="text-[10px] font-semibold uppercase"
              style={{ color: "#444", letterSpacing: "1.4px" }}
            >
              Servers
            </span>
            <button
              onClick={() => setServerPanelOpen(false)}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: "#555" }}
            >
              <X size={11} />
            </button>
          </div>

          <div className="py-1.5">
            {SERVERS.map((srv) => {
              const active = srv.key === currentServer;
              return (
                <button
                  key={srv.key}
                  onClick={() => {
                    onServerChange(srv.key);
                    setServerPanelOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                  style={{ background: active ? "rgba(232,160,32,0.07)" : "transparent" }}
                >
                  <div
                    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full"
                    style={{
                      background: active ? "rgba(232,160,32,0.15)" : "rgba(255,255,255,0.05)",
                    }}
                  >
                    <Play size={9} fill={active ? "#e8a020" : "#555"} strokeWidth={0} />
                  </div>
                  <p
                    className="flex-1 text-[12px] font-semibold truncate"
                    style={{ color: active ? "#e8a020" : "rgba(255,255,255,0.6)" }}
                  >
                    {srv.label.replace(" — Default", "")}
                  </p>
                  {active && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#e8a020]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Episode empty state ───────────────────────────────────────────────────────

function EpisodeEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 w-full rounded-2xl"
      style={{
        height: 220,
        background: "#060606",
        border: "0.75px solid rgba(255,255,255,0.04)",
      }}
    >
      <Play size={32} strokeWidth={1} style={{ color: "#1e1e1e" }} />
      <p className="text-[13px]" style={{ color: "#333" }}>
        Select an episode to start watching
      </p>
    </div>
  );
}

// ── Section heading (Instrument Serif italic) ─────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif text-[22px] md:text-[24px] italic"
      style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em" }}
    >
      {children}
    </h2>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaDetail({ mediaType }: { mediaType: MediaType }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [data, setData] = useState<DetailData | null>(null);
  const [enriched, setEnriched] = useState<EnrichedMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [moviePlayerOpen, setMoviePlayerOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerKey>("111movies");

  // Person modal
  const [personModalId, setPersonModalId] = useState<number | null>(null);

  // Library state
  const [isWatched, setIsWatched] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [watchedEps, setWatchedEps] = useState<Record<string, number[]>>({});

  const buildLibraryItem = useCallback((): LibraryItem | null => {
    if (!enriched) return null;
    return {
      id: enriched.id,
      mediaType,
      title: enriched.title,
      posterPath: enriched.posterPath,
      backdropPath: enriched.backdropPath,
      year: enriched.year ?? "",
      rating: enriched.voteAverage ?? null,
      genre_ids: enriched.genres.map((g) => g.id),
    };
  }, [enriched, mediaType]);

  const toggleWatched = useCallback(() => {
    const item = buildLibraryItem();
    if (!item) return;
    const lib = loadLibrary();
    const alreadyWatched = lib.watched.some((w) => w.id === item.id && w.mediaType === mediaType);
    if (alreadyWatched) {
      lib.watched = lib.watched.filter((w) => !(w.id === item.id && w.mediaType === mediaType));
    } else {
      lib.watched = [item, ...lib.watched.filter((w) => !(w.id === item.id && w.mediaType === mediaType))];
    }
    saveLibrary(lib);
    setIsWatched(!alreadyWatched);
  }, [buildLibraryItem, mediaType]);

  const toggleWatchlist = useCallback(() => {
    const item = buildLibraryItem();
    if (!item) return;
    const lib = loadLibrary();
    const inList = lib.watchlist.some((w) => w.id === item.id && w.mediaType === mediaType);
    if (inList) {
      lib.watchlist = lib.watchlist.filter((w) => !(w.id === item.id && w.mediaType === mediaType));
    } else {
      lib.watchlist = [item, ...lib.watchlist.filter((w) => !(w.id === item.id && w.mediaType === mediaType))];
    }
    saveLibrary(lib);
    setIsInWatchlist(!inList);
  }, [buildLibraryItem, mediaType]);

  const handleRatingChange = useCallback((v: number | null) => {
    setUserRating(v);
    if (!id) return;
    const lib = loadLibrary();
    if (v === null) {
      delete lib.ratings[`${mediaType}:${id}`];
    } else {
      lib.ratings[`${mediaType}:${id}`] = v;
    }
    saveLibrary(lib);
  }, [id, mediaType]);

  const toggleEpWatched = useCallback((season: number, ep: number) => {
    if (!id) return;
    setWatchedEps((prev) => {
      const key = String(season);
      const list = prev[key] ?? [];
      const updated = list.includes(ep) ? list.filter((e) => e !== ep) : [...list, ep];
      const next = { ...prev, [key]: updated };
      const lib = loadLibrary();
      if (!lib.watching[id]) {
        lib.watching[id] = { season, selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      }
      lib.watching[id].watchedEpisodesBySeason = next;
      lib.watching[id].lastWatchedAt = Date.now();
      saveLibrary(lib);
      return next;
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setData(null);
    setEnriched(null);
    setSelectedSeason(1);
    setSelectedEpisode(null);
    setMoviePlayerOpen(false);

    const lib = loadLibrary();
    setIsWatched(lib.watched.some((w) => w.id === Number(id) && w.mediaType === mediaType));
    setIsInWatchlist(lib.watchlist.some((w) => w.id === Number(id) && w.mediaType === mediaType));
    setUserRating(lib.ratings[`${mediaType}:${id}`] ?? null);
    setWatchedEps(lib.watching[id]?.watchedEpisodesBySeason ?? {});

    fetchEnrichedMedia(mediaType, id)
      .then((e) => {
        setEnriched(e);
        setData({
          id: e.id,
          title: e.title,
          name: e.title,
          overview: e.overview,
          poster_path: e.posterPath,
          backdrop_path: e.backdropPath,
          vote_average: e.voteAverage,
          vote_count: e.voteCount,
          release_date: mediaType === "movie" ? e.releaseDate ?? undefined : undefined,
          first_air_date: mediaType === "tv" ? e.releaseDate ?? undefined : undefined,
          runtime: e.runtime ?? undefined,
          episode_run_time: e.runtime ? [e.runtime] : undefined,
          genres: e.genres,
          tagline: e.tagline ?? undefined,
          status: e.status ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          original_language: (e._tmdb as any)?.original_language,
          number_of_seasons: e.numberOfSeasons ?? undefined,
          number_of_episodes: e.numberOfEpisodes ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          production_companies: (e._tmdb as any)?.production_companies,
          credits: { cast: e.cast },
        });
      })
      .catch(() => setError("Could not load details. Please try again."))
      .finally(() => setLoading(false));
  }, [id, mediaType]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const title = data?.title || data?.name || "Unknown";
  const releaseDate = data?.release_date || data?.first_air_date;
  const runtime = data?.runtime ?? data?.episode_run_time?.[0];
  const posterUrl = data?.poster_path ? `${POSTER_BASE}${data.poster_path}` : null;
  const backdropUrl = data?.backdrop_path ? `${BACKDROP_BASE}${data.backdrop_path}` : null;
  const rating = data ? Math.round(data.vote_average * 10) / 10 : null;
  const studio = data?.production_companies?.[0]?.name;
  const isAiring = data?.status === "Returning Series" || data?.status === "In Production";

  const director = enriched?.director ?? null;
  const directorId = enriched?.directorId ?? null;
  const directorProfilePath = enriched?.directorProfilePath ?? null;
  const creators = enriched?.creators ?? [];
  const topCast = enriched?.topCast ?? [];

  const totalSeasons = data?.number_of_seasons ?? 1;
  const totalEpisodes = data?.number_of_episodes ?? 12;
  const episodesThisSeason = Math.min(Math.ceil(totalEpisodes / totalSeasons), 60);

  const handleWatchNow = () => {
    if (mediaType === "movie") {
      setMoviePlayerOpen(true);
      setTimeout(() => {
        document.getElementById("movie-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      setSelectedEpisode(1);
      setTimeout(() => {
        document.getElementById("ep-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  // Meta tokens for the one-line strip
  const metaTokens: string[] = [];
  if (releaseDate) metaTokens.push(formatYear(releaseDate));
  if (runtime) metaTokens.push(formatRuntime(runtime));
  if (mediaType === "tv" && data?.number_of_seasons) {
    metaTokens.push(`${data.number_of_seasons} Season${data.number_of_seasons !== 1 ? "s" : ""}`);
    if (data.number_of_episodes) metaTokens.push(`${data.number_of_episodes} Eps`);
  }
  if (studio) metaTokens.push(studio);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-[#f0f0f0] font-ui" style={{ background: "#000" }}>

      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-40 w-full transition-all duration-300"
        style={{
          background: navScrolled ? "rgba(9,7,8,0.88)" : "rgba(9,7,8,0.0)",
          backdropFilter: navScrolled ? "blur(28px) saturate(160%)" : "blur(8px)",
          WebkitBackdropFilter: navScrolled ? "blur(28px) saturate(160%)" : "blur(8px)",
          borderBottom: navScrolled ? "0.75px solid rgba(255,220,215,0.07)" : "0.75px solid transparent",
        }}
      >
        <div className="flex items-center gap-4 px-5 md:px-10 lg:px-12 h-[56px]">
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 mr-2 opacity-90 hover:opacity-100 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#e63946] shadow-[0_0_10px_rgba(230,57,70,0.45)]">
              <Film size={13} className="text-white" />
            </div>
            <span className="hidden sm:inline text-[16px] font-black uppercase tracking-[0.03em] text-white" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>GOODFILM</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {([
              { label: "Home",     icon: Home,       to: "/"         },
              { label: "Movies",   icon: Film,       to: "/movies"   },
              { label: "TV Shows", icon: Tv,         to: "/tv-shows" },
              { label: "Anime",    icon: Wand2,      to: "/anime"    },
              { label: "Mood",     icon: Search,     to: "/mood"     },
              { label: "Lists",    icon: LayoutList, to: "/lists"    },
            ] as const).map(({ label, icon: Icon, to }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/[0.06] hover:text-white"
                style={{ color: "rgba(242,236,232,0.42)" }}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center ml-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-full px-4 py-[7px] text-[12px] font-semibold transition-colors hover:bg-white/[0.06] hover:text-white"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "0.75px solid rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft size={13} />
              Back
            </button>
          </div>
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#e8a020]" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-4 py-40 px-6 text-center">
          <p className="text-[15px]" style={{ color: "#777" }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-[#e8a020] px-5 py-2 text-sm font-bold text-black"
          >
            Go back
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Hero ── */}
          <div className="relative overflow-hidden" style={{ height: "clamp(360px, 68vh, 720px)" }}>
            {backdropUrl ? (
              <img
                src={backdropUrl}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ filter: "brightness(0.75)" }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg,#1c1005,#000)" }}
              />
            )}

            {/* Multi-layer vignettes for depth */}
            {/* Bottom — heavy black crawl */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #000 0%, rgba(0,0,0,0.72) 32%, rgba(0,0,0,0.14) 60%, transparent 100%)" }}
            />
            {/* Left — dark for legibility */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.38) 40%, transparent 70%)" }}
            />
            {/* Top — subtle overhead fade */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, transparent 28%)" }}
            />
          </div>

          {/* ── Poster + Info — overlaps hero ── */}
          <div
            className="relative px-6 md:px-12 lg:px-16 pb-6"
            style={{ marginTop: "clamp(-200px, -26vh, -240px)" }}
          >
            <div className="flex flex-col md:flex-row items-end md:items-start gap-8 md:gap-12">

              {/* Poster */}
              <div className="shrink-0 self-start">
                <div
                  className="overflow-hidden rounded-xl"
                  style={{
                    width: "clamp(110px, 11vw, 190px)",
                    boxShadow: "0 40px 96px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.06)",
                  }}
                >
                  {posterUrl ? (
                    <img src={posterUrl} alt={title} className="w-full object-cover" />
                  ) : (
                    <div
                      className="flex aspect-[2/3] items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Film size={40} className="text-white/15" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info column */}
              <div className="flex-1 min-w-0 flex flex-col gap-4 md:pt-28 lg:pt-36">

                {/* Genre labels — amber text, dot-separated */}
                {data.genres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {data.genres.slice(0, 5).map((g, i) => (
                      <React.Fragment key={g.id}>
                        {i > 0 && (
                          <span style={{ color: "rgba(232,160,32,0.3)", fontSize: 10 }}>·</span>
                        )}
                        <span
                          className="text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: "rgba(232,160,32,0.75)", letterSpacing: "1px" }}
                        >
                          {g.name}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h1
                  className="font-cinematic text-[52px] md:text-[72px] lg:text-[84px] leading-none text-white"
                  style={{ letterSpacing: "0.01em", textShadow: "0 4px 32px rgba(0,0,0,0.8)" }}
                >
                  {title}
                </h1>

                {/* Tagline — Instrument Serif italic */}
                {enriched?.tagline && (
                  <p
                    className="font-serif text-[14px] italic"
                    style={{ color: "rgba(232,160,32,0.65)", maxWidth: 560 }}
                  >
                    "{enriched.tagline}"
                  </p>
                )}

                {/* Meta strip — single line with separators */}
                {metaTokens.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {/* TMDb rating */}
                    {rating !== null && rating > 0 && (
                      <>
                        <span className="flex items-center gap-1 text-[13px] font-bold" style={{ color: "#e8a020" }}>
                          <Star size={11} fill="#e8a020" strokeWidth={0} />
                          {rating}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>·</span>
                      </>
                    )}
                    {/* Status badge */}
                    {isAiring ? (
                      <>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold"
                          style={{ color: "rgb(74,222,128)" }}
                        >
                          <span
                            className="inline-block w-[6px] h-[6px] rounded-full animate-live-pulse"
                            style={{ background: "rgb(74,222,128)" }}
                          />
                          Airing
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>·</span>
                      </>
                    ) : data.status ? (
                      <>
                        <span className="text-[12px] font-medium" style={{ color: "#555" }}>
                          {data.status}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>·</span>
                      </>
                    ) : null}
                    {metaTokens.map((tok, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>·</span>}
                        <span className="text-[12px] font-medium" style={{ color: "#666" }}>{tok}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* External ratings row */}
                {(enriched?.imdbRating || enriched?.rottenTomatoes || enriched?.metacritic) && (
                  <div className="flex flex-wrap items-center gap-4">
                    {enriched?.imdbRating && (
                      <span className="flex items-center gap-2 text-[12px]">
                        <span
                          className="rounded-[3px] px-[6px] py-[2px] text-[9px] font-black text-black tracking-wide"
                          style={{ background: "#e8a020" }}
                        >
                          IMDb
                        </span>
                        <span className="font-bold" style={{ color: "#e8a020" }}>
                          {enriched.imdbRating.toFixed(1)}
                        </span>
                        {enriched.imdbVotes && (
                          <span className="text-[11px]" style={{ color: "#3d3d3d" }}>
                            {enriched.imdbVotes.toLocaleString()}
                          </span>
                        )}
                      </span>
                    )}
                    {enriched?.rottenTomatoes && (
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span>🍅</span>
                        <span className="font-semibold" style={{ color: "rgba(255,80,50,0.9)" }}>
                          {enriched.rottenTomatoes}
                        </span>
                      </span>
                    )}
                    {enriched?.metacritic && (
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span
                          className="rounded-[3px] px-[5px] py-[1px] text-[9px] font-black tracking-wide"
                          style={{ background: "#f8cf29", color: "#000" }}
                        >
                          MC
                        </span>
                        <span className="font-semibold" style={{ color: "#c8a820" }}>
                          {enriched.metacritic}
                        </span>
                      </span>
                    )}
                  </div>
                )}

                {/* Synopsis */}
                {data.overview && (
                  <p
                    className="text-[14px] leading-[1.75] max-w-[640px]"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {enriched?.richPlot || data.overview}
                  </p>
                )}

                {/* Awards */}
                {enriched?.awards && (
                  <p className="text-[11px] font-medium" style={{ color: "#454545", maxWidth: 560 }}>
                    {enriched.awards}
                  </p>
                )}

                {/* ── Action buttons ── */}
                <div className="flex flex-wrap items-center gap-3 pt-1">

                  {/* Watch Now — primary amber fill */}
                  <button
                    onClick={handleWatchNow}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-[11px] text-[13px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{ background: "#e8a020", color: "#000" }}
                  >
                    <Play size={13} fill="currentColor" strokeWidth={0} />
                    Watch Now
                  </button>

                  {/* Watchlist */}
                  <button
                    onClick={toggleWatchlist}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-[11px] text-[13px] font-semibold transition-all active:scale-[0.97]"
                    style={
                      isInWatchlist
                        ? { background: "rgba(232,160,32,0.1)", color: "#e8a020", border: "0.75px solid rgba(232,160,32,0.3)" }
                        : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "0.75px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {isInWatchlist
                      ? <BookmarkCheck size={14} strokeWidth={2} />
                      : <Plus size={14} strokeWidth={2} />}
                    {isInWatchlist ? "In Watchlist" : "Watchlist"}
                  </button>

                  {/* Watched */}
                  <button
                    onClick={toggleWatched}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-[11px] text-[13px] font-semibold transition-all active:scale-[0.97]"
                    style={
                      isWatched
                        ? { background: "rgba(74,222,128,0.08)", color: "rgb(74,222,128)", border: "0.75px solid rgba(74,222,128,0.28)" }
                        : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "0.75px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    <Eye size={13} fill={isWatched ? "currentColor" : "none"} strokeWidth={isWatched ? 0 : 1.5} />
                    {isWatched ? "Watched" : "Mark Watched"}
                  </button>

                  {/* Rating */}
                  <div
                    className="inline-flex items-center rounded-lg px-4 py-[10px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "0.75px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <StarRatingPicker value={userRating} onChange={handleRatingChange} />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div
            className="mx-6 md:mx-12 lg:mx-16 my-8"
            style={{ height: "0.75px", background: "rgba(255,255,255,0.055)" }}
          />

          {/* ── Movie inline player ── */}
          {mediaType === "movie" && moviePlayerOpen && (
            <div
              id="movie-player"
              className="px-6 md:px-12 lg:px-16 pb-10"
              style={{ scrollMarginTop: 80 }}
            >
              <InlinePlayer
                mediaType="movie"
                tmdbId={id!}
                currentServer={selectedServer}
                onServerChange={setSelectedServer}
                onClose={() => setMoviePlayerOpen(false)}
              />
            </div>
          )}

          {/* ── TV Episodes ── */}
          {mediaType === "tv" && (
            <div
              id="ep-section"
              className="px-6 md:px-12 lg:px-16 pb-10"
              style={{ scrollMarginTop: 80 }}
            >
              {/* Season selector */}
              {totalSeasons > 1 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSelectedSeason(s); setSelectedEpisode(null); }}
                      className="rounded-lg px-4 py-[9px] text-[12px] font-semibold transition-all active:scale-[0.97]"
                      style={
                        selectedSeason === s
                          ? { background: "#e8a020", color: "#000" }
                          : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "0.75px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      Season {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Section label + watched count */}
              <div className="flex items-baseline gap-5 mb-6">
                <SectionHeading>
                  {totalSeasons > 1 ? `Season ${selectedSeason}` : "Episodes"}
                </SectionHeading>
                {(() => {
                  const watchedCount = (watchedEps[String(selectedSeason)] ?? []).length;
                  return watchedCount > 0 ? (
                    <span className="text-[12px] font-semibold" style={{ color: "rgba(74,222,128,0.8)" }}>
                      {watchedCount}/{episodesThisSeason} watched
                    </span>
                  ) : null;
                })()}
                {selectedEpisode && (
                  <span className="text-[12px]" style={{ color: "#444" }}>
                    · Ep {selectedEpisode} playing
                  </span>
                )}
              </div>

              {/* Episode chips */}
              <div className="flex flex-wrap gap-2.5 mb-8">
                {Array.from({ length: episodesThisSeason }, (_, i) => i + 1).map((ep) => {
                  const active = selectedEpisode === ep;
                  const watched = (watchedEps[String(selectedSeason)] ?? []).includes(ep);
                  return (
                    <div key={ep} className="relative group">
                      <button
                        onClick={() => setSelectedEpisode(ep)}
                        className="flex items-center justify-center rounded-lg text-[14px] font-semibold transition-all active:scale-95"
                        style={{
                          width: 56,
                          height: 56,
                          background: watched
                            ? "rgba(74,222,128,0.07)"
                            : active ? "rgba(232,160,32,0.11)" : "rgba(255,255,255,0.03)",
                          border: watched
                            ? "0.75px solid rgba(74,222,128,0.3)"
                            : active
                              ? "1px solid rgba(232,160,32,0.5)"
                              : "0.75px solid rgba(255,255,255,0.07)",
                          color: watched ? "rgb(74,222,128)" : active ? "#e8a020" : "#555",
                        }}
                      >
                        {watched ? <Check size={15} strokeWidth={2.5} /> : ep}
                      </button>
                      {watched && (
                        <span
                          className="absolute -bottom-4 left-0 right-0 text-center text-[9px] font-semibold"
                          style={{ color: "rgba(74,222,128,0.5)" }}
                        >
                          {ep}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEpWatched(selectedSeason, ep); }}
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          background: watched ? "rgb(74,222,128)" : "#1a1a1a",
                          border: watched ? "none" : "0.75px solid rgba(255,255,255,0.18)",
                          color: watched ? "#000" : "#555",
                        }}
                        title={watched ? "Unmark watched" : "Mark as watched"}
                      >
                        <Check size={10} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedEpisode ? (
                <InlinePlayer
                  mediaType="tv"
                  tmdbId={id!}
                  season={selectedSeason}
                  episode={selectedEpisode}
                  currentServer={selectedServer}
                  onServerChange={setSelectedServer}
                  onClose={() => setSelectedEpisode(null)}
                />
              ) : (
                <EpisodeEmptyState />
              )}
            </div>
          )}

          {/* ── Cast & Crew ── */}
          {(director || creators.length > 0 || topCast.length > 0) && (
            <div className="px-6 md:px-12 lg:px-16 pb-20">
              <div
                className="mx-0 mb-8"
                style={{ height: "0.75px", background: "rgba(255,255,255,0.055)" }}
              />

              <div className="mb-7">
                <SectionHeading>Cast & Crew</SectionHeading>
              </div>

              <div
                className="flex gap-6 overflow-x-auto pb-3"
                style={{ scrollbarWidth: "none" }}
              >
                {director && (
                  <CastCard
                    name={director}
                    role="Director"
                    profilePath={directorProfilePath}
                    isCredit
                    onPersonClick={directorId ? () => setPersonModalId(directorId) : undefined}
                  />
                )}
                {creators.map((c) => (
                  <CastCard key={c} name={c} role="Creator" profilePath={null} isCredit />
                ))}

                {(director || creators.length > 0) && topCast.length > 0 && (
                  <div
                    className="shrink-0 self-center"
                    style={{ width: 1, height: 56, background: "rgba(255,255,255,0.06)", margin: "0 6px" }}
                  />
                )}

                {topCast.map((m) => (
                  <CastCard
                    key={m.id}
                    name={m.name}
                    role={m.character || ""}
                    profilePath={m.profile_path}
                    onPersonClick={() => setPersonModalId(m.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Person modal ── */}
      <PersonModal
        open={personModalId !== null}
        personId={personModalId}
        onClose={() => setPersonModalId(null)}
        onOpenItem={(item: MediaItem, mediaType: MediaType) => {
          setPersonModalId(null);
          navigate(`/media/${mediaType}/${item.id}`);
        }}
        isFollowed={false}
        onToggleFollow={() => {}}
      />

      {/* ── Footer ── */}
      <footer
        className="border-t px-6 md:px-12 py-8 text-center text-[11px]"
        style={{ borderColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.16)" }}
      >
        Data provided by{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/40 transition-colors"
        >
          TMDB
        </a>
      </footer>
    </div>
  );
}
