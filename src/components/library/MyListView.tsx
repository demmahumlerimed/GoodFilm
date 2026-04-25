// ─────────────────────────────────────────────────────────────────────────────
// GoodFilm — My Library / Catalog View
// Changes vs original:
//   1. Rotating movie-quote header replaces blurred poster mosaic
//   2. Card action buttons have stronger contrast / filled surfaces
//   3. Sync (bulk-link) button removed from header
//   4. Full "Waiting" tab added (mutual exclusivity preserved)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, Check, ChevronRight, Clock, Download, Film,
  Play, RefreshCw, Search, Star, Upload, X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { keyFor } from "../../utils/library";
import { POSTER_BASE } from "../../config";
import { MOVIE_QUOTES } from "../../constants/quotes";
import type { AppLanguage, LibraryItem, MediaType, UserLibrary } from "../../types";

// ── Local types ───────────────────────────────────────────────────────────────

type CatalogTab  = "all" | "watchlist" | "watching" | "waiting" | "watched";
type CatalogView = "grid" | "list" | "rail";
type CatalogSort = "added" | "title" | "year" | "rating";
type MediaFilter = "all" | "movie" | "tv" | "anime";

type AnnotatedItem = LibraryItem & {
  status: "watchlist" | "watching" | "waiting" | "watched";
};

// ── Rotating quote hook ───────────────────────────────────────────────────────

function useRotatingQuote(intervalMs = 8000) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MOVIE_QUOTES.length));
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % MOVIE_QUOTES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return MOVIE_QUOTES[idx];
}

// ── CatalogStatusBadge ────────────────────────────────────────────────────────

function CatalogStatusBadge({
  status,
  compact = false,
}: {
  status: "watchlist" | "watching" | "waiting" | "watched";
  compact?: boolean;
}) {
  if (status === "watchlist")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[3px] font-semibold leading-none",
          compact
            ? "rounded-full bg-[#e8a020]/22 px-[5px] py-[3px] text-[11px] text-[#e8a020]"
            : "rounded-[5px] border border-[#e8a020]/22 bg-[#e8a020]/10 px-2 py-[3px] text-[10px] text-[#e8a020] shadow-[inset_2px_0_0_0_rgba(239,180,63,0.45)]",
        )}
      >
        <Bookmark size={compact ? 6 : 8} fill="currentColor" />
        {!compact && "To Watch"}
      </span>
    );
  if (status === "watching")
    return (
      <span
        className={cn(
          "inline-flex items-center font-semibold leading-none",
          compact
            ? "gap-[3px] rounded-full bg-cyan-500/22 px-[5px] py-[3px] text-[11px] text-cyan-400"
            : "gap-1.5 rounded-[5px] border border-cyan-500/22 bg-cyan-500/10 py-[3px] pl-1.5 pr-2 text-[10px] text-cyan-400 shadow-[inset_2px_0_0_0_rgba(34,211,238,0.45)]",
        )}
      >
        {compact ? (
          <Play size={6} fill="currentColor" />
        ) : (
          /* Design-spell: live broadcast dot — signals active consumption */
          <span className="relative flex h-[7px] w-[7px] shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/70" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-cyan-400" />
          </span>
        )}
        {!compact && "Watching"}
      </span>
    );
  if (status === "waiting")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[3px] font-semibold leading-none",
          compact
            ? "rounded-full bg-amber-500/22 px-[5px] py-[3px] text-[11px] text-amber-400"
            : "rounded-[5px] border border-amber-500/22 bg-amber-500/10 px-2 py-[3px] text-[10px] text-amber-400 shadow-[inset_2px_0_0_0_rgba(251,191,36,0.45)]",
        )}
      >
        <Clock size={compact ? 6 : 8} />
        {!compact && "Waiting"}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[3px] font-semibold leading-none",
        compact
          ? "rounded-full bg-white/14 px-[5px] py-[3px] text-[11px] text-white/50"
          : "rounded-[5px] border border-white/10 bg-white/[0.06] px-2 py-[3px] text-[10px] text-white/45 shadow-[inset_2px_0_0_0_rgba(255,255,255,0.12)]",
      )}
    >
      <Check size={compact ? 6 : 8} />
      {!compact && "Watched"}
    </span>
  );
}

// ── CatalogGridCard ───────────────────────────────────────────────────────────

function CatalogGridCard({
  item,
  status,
  userRating,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onWatching,
  onWaiting,
  onRemove,
}: {
  item: AnnotatedItem;
  status: "watchlist" | "watching" | "waiting" | "watched";
  userRating?: number;
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onWatching: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: cy * -7, y: cx * 7 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const statusRing =
    status === "watchlist"
      ? "ring-1 ring-inset ring-[#e8a020]/28"
      : status === "watching"
      ? "ring-1 ring-inset ring-cyan-500/32"
      : status === "waiting"
      ? "ring-1 ring-inset ring-amber-500/28"
      : "";

  return (
    <div
      className={cn(
        "group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[12px] bg-white/[0.04]",
        statusRing,
      )}
      style={{
        transform: `perspective(520px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.12s ease-out",
        willChange: "transform",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
    >
      {/* Poster */}
      {item.posterPath ? (
        <img
          src={`${POSTER_BASE}${item.posterPath}`}
          alt={item.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.06]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/[0.03]">
          <Film size={26} className="text-white/12" />
          <p className="px-3 text-center text-[11px] leading-tight text-white/18">{item.title}</p>
        </div>
      )}

      {/* Bottom gradient + persistent info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-2 pb-2.5 pt-14">
        <p className="text-[11px] font-semibold leading-snug text-white line-clamp-2">{item.title}</p>
        <div className="mt-[3px] flex items-center gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/32">
            {item.mediaType === "tv" ? "TV" : "Film"}
          </span>
          {item.year && item.year !== "—" && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="text-[11px] text-white/32">{item.year}</span>
            </>
          )}
          {item.rating != null && item.rating > 0 && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="text-[11px] text-white/38">★ {item.rating.toFixed(1)}</span>
            </>
          )}
          {userRating != null && userRating > 0 && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="text-[11px] font-semibold text-[#e8a020]">★ {userRating.toFixed(1)}</span>
            </>
          )}
        </div>
      </div>

      {/* Compact status badge */}
      <div className="absolute left-1.5 top-1.5">
        <CatalogStatusBadge status={status} compact />
      </div>

      {/* Watchlist: gold shimmer strip */}
      {status === "watchlist" && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#e8a020]/55 to-transparent" />
      )}
      {/* Watching: cyan progress strip */}
      {status === "watching" && (
        <div className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-black/30">
          <div className="h-full w-[52%] rounded-r-full bg-cyan-400/75" />
        </div>
      )}
      {/* Waiting: amber top strip */}
      {status === "waiting" && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />
      )}

      {/* Hover action overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/82 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Open Details — solid gold surface, high contrast */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="w-[116px] rounded-[8px] bg-[#e8a020] py-1.5 text-[11px] font-bold text-black shadow-[0_2px_10px_rgba(239,180,63,0.3)] transition hover:brightness-110 active:scale-[0.98]"
        >
          Open Details
        </button>

        {/* Mark Watched — solid green */}
        {status !== "watched" && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
            className="w-[116px] rounded-[8px] bg-emerald-600 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            ✓ Mark Watched
          </button>
        )}

        {/* Watching — solid cyan */}
        {status !== "watching" && (
          <button
            onClick={(e) => { e.stopPropagation(); onWatching(); }}
            className="w-[116px] rounded-[8px] bg-cyan-700 py-1.5 text-[11px] font-bold text-white transition hover:bg-cyan-600 active:scale-[0.98]"
          >
            ▶ Watching
          </button>
        )}

        {/* Waiting — solid amber */}
        {status !== "waiting" && (
          <button
            onClick={(e) => { e.stopPropagation(); onWaiting(); }}
            className="w-[116px] rounded-[8px] bg-amber-700 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600 active:scale-[0.98]"
          >
            ⏳ Waiting
          </button>
        )}

        {/* Watchlist — solid indigo outline */}
        {status !== "watchlist" && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
            className="w-[116px] rounded-[8px] border border-[#e8a020]/50 bg-[#e8a020]/15 py-1.5 text-[11px] font-semibold text-[#e8a020] transition hover:bg-[#e8a020]/25 active:scale-[0.98]"
          >
            + Watchlist
          </button>
        )}

        {/* Remove — solid red */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-[116px] rounded-[8px] bg-red-700/80 py-1.5 text-[11px] font-bold text-red-100 transition hover:bg-red-600 active:scale-[0.98]"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ── CatalogListRow ────────────────────────────────────────────────────────────

function CatalogListRow({
  item,
  status,
  userRating,
  watching,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onWatching,
  onWaiting,
  onRemove,
}: {
  item: AnnotatedItem;
  status: "watchlist" | "watching" | "waiting" | "watched";
  userRating?: number;
  watching?: { season: number; watchedEpisodes: number };
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onWatching: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const accentClass =
    status === "watchlist"
      ? "bg-[#e8a020]/65"
      : status === "watching"
      ? "bg-cyan-400/65"
      : status === "waiting"
      ? "bg-amber-400/65"
      : "bg-white/18";

  return (
    <div className="group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.05]">
      {/* Left status accent strip — always subtly visible, bright on hover */}
      <div
        className={cn(
          "absolute bottom-1.5 left-0 top-1.5 w-[2.5px] rounded-r-full transition-all duration-200 opacity-[0.18] group-hover:opacity-75",
          accentClass,
        )}
      />
      {/* Ambient left-bleed glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-[10px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-gradient-to-r from-white/[0.015] to-transparent" />

      {/* Poster thumbnail */}
      <div
        className="h-[58px] w-[40px] shrink-0 cursor-pointer overflow-hidden rounded-[7px] bg-white/[0.06]"
        onClick={onOpen}
      >
        {item.posterPath ? (
          <img
            src={`${POSTER_BASE}${item.posterPath}`}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={13} className="text-white/18" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <p className="truncate text-[13px] font-semibold leading-tight text-white">
          {item.title}
          {item.year && item.year !== "—" && (
            <span className="ml-1 text-[11px] font-normal text-white/35">({item.year})</span>
          )}
        </p>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-[10px] font-medium text-white/32">
            {item.mediaType === "tv" ? "TV" : "Film"}
          </span>
          {item.rating != null && item.rating > 0 && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="inline-flex items-center gap-[2px] text-[10px] text-white/40">
                <Star size={8} className="text-white/28" />
                {item.rating.toFixed(1)}
              </span>
            </>
          )}
          {userRating != null && userRating > 0 && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="inline-flex items-center gap-[2px] text-[10px] font-semibold text-[#e8a020]">
                <Star size={8} fill="currentColor" />
                {userRating.toFixed(1)}
              </span>
            </>
          )}
          {watching && item.mediaType === "tv" && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="text-[10px] text-cyan-400">
                S{watching.season} · {watching.watchedEpisodes} ep
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="hidden shrink-0 sm:block">
        <CatalogStatusBadge status={status} />
      </div>

      {/* Action buttons — slide in from right on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
        {status !== "watched" && (
          <button
            onClick={onToggleWatched}
            title="Mark Watched"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/80 text-white transition hover:bg-emerald-500"
          >
            <Check size={12} />
          </button>
        )}
        {status !== "watching" && (
          <button
            onClick={onWatching}
            title="Mark as Watching"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-700/80 text-white transition hover:bg-cyan-600"
          >
            <Play size={11} />
          </button>
        )}
        {status !== "waiting" && (
          <button
            onClick={onWaiting}
            title="Move to Waiting"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/80 text-white transition hover:bg-amber-600"
          >
            <Clock size={11} />
          </button>
        )}
        {status !== "watchlist" && (
          <button
            onClick={onToggleWatchlist}
            title="Add to Watchlist"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8a020]/20 text-[#e8a020] transition hover:bg-[#e8a020]/35"
          >
            <Bookmark size={11} />
          </button>
        )}
        <button
          onClick={onRemove}
          title="Remove"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-700/60 text-red-200 transition hover:bg-red-600/80"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

// ── QuoteHeader ───────────────────────────────────────────────────────────────

function QuoteHeader({ stats }: {
  stats: {
    total: number;
    movies: number;
    tv: number;
    avgRating: number | null;
    watchingCount: number;
    watchlistCount: number;
    waitingCount: number;
    watchedCount: number;
  };
}) {
  const quote = useRotatingQuote(9000);

  return (
    <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 mb-0 overflow-hidden">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-[#07080d]" aria-hidden="true" />

      {/* Subtle gold radial glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(239,180,63,0.07),transparent_70%)]"
        aria-hidden="true"
      />

      {/* Bottom bleed into page */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#07080d] to-transparent"
        aria-hidden="true"
      />

      {/* Giant faint quote watermark — decorative background text */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-6"
        aria-hidden="true"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={quote.quote}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="select-none text-center text-[clamp(20px,4vw,52px)] font-black italic leading-tight tracking-[-0.02em] text-white/[0.04]"
          >
            "{quote.quote}"
          </motion.p>
        </AnimatePresence>
      </div>

      {/* LAYER 1: Title + Stats + Actions */}
      <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-8 pb-0">
        <div className="flex flex-wrap items-end justify-between gap-4">

          {/* Title block with animated quote underneath */}
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-[26px] font-black tracking-[-0.04em] text-white leading-none sm:text-[30px] lg:text-[34px]">
                My Library
              </h1>
              <span className="mb-0.5 rounded-[6px] bg-white/8 px-2 py-[3px] text-[12px] font-bold tabular-nums text-white/45 leading-none">
                {stats.total}
              </span>
            </div>

            {/* Subtitle stats */}
            <p className="mt-1.5 text-[12px] tracking-wide text-white/38">
              {[
                stats.movies > 0 && `${stats.movies} film${stats.movies !== 1 ? "s" : ""}`,
                stats.tv > 0 && `${stats.tv} show${stats.tv !== 1 ? "s" : ""}`,
                stats.avgRating != null && `★ ${stats.avgRating.toFixed(1)} avg`,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>

            {/* Animated movie quote — rendered below stats */}
            <AnimatePresence mode="wait">
              <motion.div
                key={quote.quote}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="mt-3 flex items-baseline gap-2"
              >
                <Star size={10} className="shrink-0 translate-y-[1px] text-[#e8a020]/50" />
                <blockquote className="text-[11px] italic text-white/30 leading-snug">
                  "{quote.quote}"
                  <cite className="ml-1.5 not-italic text-white/20 text-[10px]">
                    — {quote.character}, <span className="text-[#e8a020]/35">{quote.show}</span>
                  </cite>
                </blockquote>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action buttons — no Sync button */}
          <div className="flex items-center gap-2">
            <button
              // onExport handled by parent — passed via prop
              id="__mylist-export"
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/10 bg-white/[0.05] px-3 text-[11px] font-medium text-white/55 backdrop-blur-sm transition hover:bg-white/[0.09] hover:text-white"
            >
              <Download size={11} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <label
              id="__mylist-import"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] bg-[#e8a020] px-3 text-[11px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
            >
              <Upload size={11} />
              <span>Import</span>
              {/* actual input injected by parent */}
            </label>
          </div>
        </div>
      </div>

      {/* Spacer for tab row attachment */}
      <div className="relative z-10 h-6" />
    </div>
  );
}

// ── MyListView — main export ──────────────────────────────────────────────────

export function MyListView({
  library,
  watchlistKeys,
  watchedKeys,
  watchingKeys,
  waitingKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onAddToWatching,
  onAddToWaiting,
  onRemoveFromLibrary,
  onExport,
  onImport,
  appLanguage: _appLanguage,
  initialTab,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  watchingKeys: Set<string>;
  waitingKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWatching: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWaiting: (item: LibraryItem, mediaType: MediaType) => void;
  onRemoveFromLibrary: (item: LibraryItem, mediaType: MediaType) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  appLanguage?: AppLanguage;
  initialTab?: CatalogTab;
}) {
  const [tab, setTab] = useState<CatalogTab>(() => initialTab || "all");
  const [viewMode, setViewMode] = useState<CatalogView>("grid");
  const [sortBy, setSortBy] = useState<CatalogSort>("added");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [query, setQuery] = useState("");
  const [randomPick, setRandomPick] = useState<AnnotatedItem | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const exportBtnRef = useRef<HTMLButtonElement>(null);

  // Wire up the export button inside QuoteHeader via DOM ref trick
  useEffect(() => {
    const el = document.getElementById("__mylist-export") as HTMLButtonElement | null;
    if (el) {
      const handler = () => onExport();
      el.addEventListener("click", handler);
      return () => el.removeEventListener("click", handler);
    }
  }, [onExport]);

  // Update tab when prop changes (e.g. navigation from stat cards)
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  // ── Merged item list with status annotation ──────────────────────────────
  const allItems = useMemo<AnnotatedItem[]>(() => {
    const seen = new Set<string>();
    const result: AnnotatedItem[] = [];
    (library.watchingItems || []).forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watching" }); }
    });
    (library.waitingItems || []).forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "waiting" }); }
    });
    library.watchlist.forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watchlist" }); }
    });
    library.watched.forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watched" }); }
    });
    return result;
  }, [library.watchlist, library.watched, library.watchingItems, library.waitingItems]);

  const tabItems = useMemo(() => {
    if (tab === "all") return allItems;
    return allItems.filter((i) => i.status === tab);
  }, [allItems, tab]);

  const isAnime = useCallback(
    (item: AnnotatedItem) =>
      item.genre_ids?.includes(16) || item.genres?.some((g) => g.id === 16) || false,
    [],
  );

  const filteredItems = useMemo(() => {
    let items = tabItems;
    if (mediaFilter === "anime") items = items.filter((i) => isAnime(i));
    else if (mediaFilter === "tv") items = items.filter((i) => i.mediaType === "tv" && !isAnime(i));
    else if (mediaFilter === "movie") items = items.filter((i) => i.mediaType === "movie" && !isAnime(i));
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    return items;
  }, [tabItems, mediaFilter, query, isAnime]);

  const sortedItems = useMemo<AnnotatedItem[]>(() => {
    const arr = [...filteredItems];
    if (sortBy === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "year") arr.sort((a, b) => (b.year || "0").localeCompare(a.year || "0"));
    else if (sortBy === "rating") {
      arr.sort((a, b) => {
        const ra = library.ratings[keyFor(a)] ?? -1;
        const rb = library.ratings[keyFor(b)] ?? -1;
        return rb - ra;
      });
    }
    return arr;
  }, [filteredItems, sortBy, library.ratings]);

  const stats = useMemo(() => {
    const total = allItems.length;
    const movies = allItems.filter((i) => i.mediaType === "movie" && !(i.genre_ids?.includes(16) || i.genres?.some((g) => g.id === 16))).length;
    const tv = allItems.filter((i) => i.mediaType === "tv" && !(i.genre_ids?.includes(16) || i.genres?.some((g) => g.id === 16))).length;
    const anime = allItems.filter((i) => i.genre_ids?.includes(16) || i.genres?.some((g) => g.id === 16)).length;
    const ratedItems = allItems.filter((i) => library.ratings[keyFor(i)] != null);
    const avgRating =
      ratedItems.length > 0
        ? ratedItems.reduce((s, i) => s + (library.ratings[keyFor(i)] || 0), 0) / ratedItems.length
        : null;
    const watchingCount = (library.watchingItems || []).length;
    const waitingCount  = (library.waitingItems  || []).length;
    const watchlistCount = library.watchlist.length;
    const watchedCount   = library.watched.length;
    return { total, movies, tv, anime, avgRating, watchingCount, waitingCount, watchlistCount, watchedCount };
  }, [allItems, library.ratings, library.watchingItems, library.waitingItems, library.watchlist.length, library.watched.length]);

  const shuffle = () => {
    if (!sortedItems.length) return;
    setRandomPick(sortedItems[Math.floor(Math.random() * sortedItems.length)]);
  };

  const sortLabels: Record<CatalogSort, string> = {
    added: "Date Added", title: "Title A→Z", year: "Release Date", rating: "My Rating",
  };

  const TABS: Array<{ key: CatalogTab; label: string; count: number }> = [
    { key: "all",       label: "All",       count: allItems.length },
    { key: "watchlist", label: "Watchlist", count: library.watchlist.length },
    { key: "watching",  label: "Watching",  count: (library.watchingItems || []).length },
    { key: "waiting",   label: "Waiting",   count: (library.waitingItems  || []).length },
    { key: "watched",   label: "Watched",   count: library.watched.length },
  ];

  const tabAccentLine = (key: CatalogTab) => {
    if (key === "watching") return "bg-cyan-400";
    if (key === "waiting")  return "bg-amber-400";
    if (key === "watched")  return "bg-white/40";
    return "bg-[#e8a020]";
  };
  const tabBadgeActive = (key: CatalogTab) => {
    if (key === "watching") return "bg-cyan-500/22 text-cyan-400";
    if (key === "waiting")  return "bg-amber-500/22 text-amber-400";
    if (key === "watched")  return "bg-white/14 text-white/60";
    return "bg-[#e8a020]/22 text-[#e8a020]";
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-8">

      {/* ══════════════════════════════════════════════════════════════════
          HEADER — Quote background + title + actions
          ══════════════════════════════════════════════════════════════════ */}
      <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 mb-0 overflow-hidden">
        {/* Dark base */}
        <div className="absolute inset-0 bg-[#07080d]" aria-hidden="true" />
        {/* Gold radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(239,180,63,0.07),transparent_70%)]" aria-hidden="true" />
        {/* Bottom bleed */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#07080d] to-transparent" aria-hidden="true" />

        {/* Giant faint watermark quote */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-6" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.p
              key={`wm-${allItems.length}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="select-none text-center text-[clamp(18px,3.5vw,48px)] font-black italic leading-tight tracking-[-0.02em] text-white/[0.035]"
            >
              "The stuff that dreams are made of."
            </motion.p>
          </AnimatePresence>
        </div>

        {/* LAYER 1: Title + Stats + Actions */}
        <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-8 pb-0">
          <div className="flex flex-wrap items-end justify-between gap-4">

            {/* Left: Title, stats, rotating quote */}
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-[26px] font-black tracking-[-0.04em] text-white leading-none sm:text-[30px] lg:text-[34px]">
                  My Library
                </h1>
                <span className="mb-0.5 rounded-[6px] bg-white/8 px-2 py-[3px] text-[12px] font-bold tabular-nums text-white/45 leading-none">
                  {stats.total}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] tracking-wide text-white/38">
                {[
                  stats.movies > 0 && `${stats.movies} film${stats.movies !== 1 ? "s" : ""}`,
                  stats.tv > 0 && `${stats.tv} show${stats.tv !== 1 ? "s" : ""}`,
                  stats.anime > 0 && `${stats.anime} anime`,
                  stats.avgRating != null && `★ ${stats.avgRating.toFixed(1)} avg`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>

              {/* Inline rotating movie quote */}
              <RotatingQuoteLine />
            </div>

            {/* Right: Export + Import (Sync removed) */}
            <div className="flex items-center gap-2">
              <button
                onClick={onExport}
                className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/10 bg-white/[0.05] px-3 text-[11px] font-medium text-white/55 backdrop-blur-sm transition hover:bg-white/[0.09] hover:text-white"
              >
                <Download size={11} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] bg-[#e8a020] px-3 text-[11px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]">
                <Upload size={11} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ""; }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* LAYER 2: Premium tab row */}
        <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 mt-6">
          <div className="flex items-end overflow-x-auto [scrollbar-width:none]">
            {TABS.map(({ key, label, count }) => {
              const isActive = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 px-3 pb-3.5 pt-2.5 text-[13px] transition-all duration-200 sm:px-4",
                    isActive
                      ? "font-semibold text-white"
                      : "font-medium text-white/35 hover:text-white/62",
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-[6px] py-[2px] text-[10px] font-bold leading-none tabular-nums transition-colors duration-200",
                      isActive ? tabBadgeActive(key) : "bg-white/6 text-white/28",
                    )}
                  >
                    {count}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="catalog-tab-indicator"
                      className={cn("absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm", tabAccentLine(key))}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="h-px bg-white/[0.07]" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY CONTROL BAR
          ══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 border-b border-white/[0.055] bg-[#07080d]/95 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-10 xl:px-14">

        {/* Row 1: Search + shuffle + view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[130px] flex-1 sm:max-w-[300px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/28" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library…"
              className="h-8 w-full rounded-[9px] border border-white/8 bg-white/[0.04] pl-8 pr-8 text-[12px] text-white placeholder-white/22 outline-none transition focus:border-white/18 focus:bg-white/[0.07]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/28 transition hover:text-white/65"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Shuffle */}
          <button
            onClick={shuffle}
            title="Random pick"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/8 bg-white/[0.03] text-white/42 transition hover:bg-white/[0.07] hover:text-[#e8a020]"
          >
            <RefreshCw size={13} />
          </button>

          {/* View mode */}
          <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-white/8 bg-white/[0.02]">
            {([["grid", "⊞"], ["list", "≡"], ["rail", "⋯"]] as const).map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as CatalogView)}
                className={cn(
                  "px-2.5 py-1.5 text-[13px] transition",
                  viewMode === mode ? "bg-white/12 text-white" : "text-white/35 hover:text-white/65",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Sort + media filter chips */}
        <div className="mt-1.5 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-white/8 bg-white/[0.03] px-2.5 text-[11px] font-medium text-white/50 transition hover:bg-white/[0.07] hover:text-white"
            >
              {sortLabels[sortBy]}
              <ChevronRight size={10} className="rotate-90 opacity-60" />
            </button>
            {showSortMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 w-[148px] overflow-hidden rounded-[10px] border border-white/10 bg-[#111318] py-1 shadow-2xl">
                {(Object.entries(sortLabels) as Array<[CatalogSort, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-[12px] transition hover:bg-white/[0.06]",
                      sortBy === key ? "text-[#e8a020]" : "text-white/62",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-3.5 w-px shrink-0 bg-white/10" />

          {(["all", "movie", "tv", "anime"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMediaFilter(type)}
              className={cn(
                "shrink-0 cursor-pointer border-b-2 px-3 py-1 text-[11px] font-medium transition",
                mediaFilter === type
                  ? type === "anime" ? "border-[#ef8c43] text-[#ef8c43]" : "border-[#e8a020] text-white"
                  : "border-transparent text-white/38 hover:text-white/65",
              )}
            >
              {type === "all" ? "All" : type === "movie" ? "Films" : type === "tv" ? "TV Shows" : "Anime"}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RANDOM PICK BANNER
          ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {randomPick && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden rounded-[14px] border border-[#e8a020]/22 bg-[#e8a020]/7"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-[7px] bg-white/10">
                {randomPick.posterPath
                  ? <img src={`${POSTER_BASE}${randomPick.posterPath}`} alt={randomPick.title} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center"><Film size={13} className="text-white/20" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8a020]/65">Tonight's Pick</p>
                <p className="truncate text-[14px] font-bold text-white">{randomPick.title}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{randomPick.year} · {randomPick.mediaType === "tv" ? "TV Show" : "Movie"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => { onOpen(randomPick, randomPick.mediaType); setRandomPick(null); }}
                  className="rounded-[8px] bg-[#e8a020] px-3 py-1.5 text-[11px] font-bold text-black transition hover:brightness-110"
                >
                  Open
                </button>
                <button
                  onClick={shuffle}
                  className="rounded-[8px] border border-white/10 bg-white/[0.05] p-1.5 text-white/45 transition hover:text-white"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => setRandomPick(null)}
                  className="rounded-[8px] border border-white/10 bg-white/[0.05] p-1.5 text-white/32 transition hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          GRID SUMMARY LINE
          ══════════════════════════════════════════════════════════════════ */}
      {sortedItems.length > 0 && (
        <div className="mt-4 mb-3 flex items-center justify-between">
          <p className="text-[11px] tabular-nums text-white/28">
            {sortedItems.length === allItems.length
              ? `${sortedItems.length} title${sortedItems.length !== 1 ? "s" : ""}`
              : `${sortedItems.length} of ${allItems.length}`}
            {query && <span className="text-white/38"> · "{query}"</span>}
          </p>
          <p className="text-[11px] text-white/20">{sortLabels[sortBy]}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CONTENT AREA
          ══════════════════════════════════════════════════════════════════ */}
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl opacity-12">
            {mediaFilter === "movie" ? "🎬" : mediaFilter === "tv" ? "📺" : mediaFilter === "anime" ? "✨" : "🎬"}
          </div>
          <p className="text-[15px] font-semibold text-white/42">
            {query
              ? `No results for "${query}"`
              : tab === "all" && mediaFilter === "movie"
              ? "You haven't added any films yet"
              : tab === "all" && mediaFilter === "tv"
              ? "You haven't added any TV shows yet"
              : tab === "all" && mediaFilter === "anime"
              ? "You haven't added any anime yet"
              : tab === "all"
              ? "Your library is empty"
              : tab === "waiting"
              ? "Nothing in Waiting"
              : `No ${tab} titles`}
          </p>
          <p className="mt-1.5 text-[13px] text-white/26">
            {query
              ? "Try a different search term"
              : tab === "waiting"
              ? "Move titles here when they're not released yet or you're not ready to watch"
              : "Add movies and shows from the Home or Search tabs"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {sortedItems.map((item) => {
            const k = keyFor(item);
            return (
              <CatalogGridCard
                key={k}
                item={item}
                status={item.status}
                userRating={library.ratings[k]}
                onOpen={() => onOpen(item, item.mediaType)}
                onToggleWatchlist={() => onToggleWatchlist(item, item.mediaType)}
                onToggleWatched={() => onToggleWatched(item, item.mediaType)}
                onWatching={() => onAddToWatching(item, item.mediaType)}
                onWaiting={() => onAddToWaiting(item, item.mediaType)}
                onRemove={() => onRemoveFromLibrary(item, item.mediaType)}
              />
            );
          })}
        </div>
      ) : viewMode === "list" ? (
        /* Design-spell: staggered cascade entrance — each row slides in with a cascading delay */
        <div className="space-y-0">
          {sortedItems.map((item, index) => {
            const k = keyFor(item);
            const watchData = item.mediaType === "tv" && library.watching[String(item.id)];
            const progress = watchData
              ? { season: watchData.season, watchedEpisodes: (watchData.watchedEpisodesBySeason?.[String(watchData.season)] || []).length }
              : undefined;
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: Math.min(index * 0.028, 0.42),
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <CatalogListRow
                  item={item}
                  status={item.status}
                  userRating={library.ratings[k]}
                  watching={progress}
                  onOpen={() => onOpen(item, item.mediaType)}
                  onToggleWatchlist={() => onToggleWatchlist(item, item.mediaType)}
                  onToggleWatched={() => onToggleWatched(item, item.mediaType)}
                  onWatching={() => onAddToWatching(item, item.mediaType)}
                  onWaiting={() => onAddToWaiting(item, item.mediaType)}
                  onRemove={() => onRemoveFromLibrary(item, item.mediaType)}
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Rail view — grouped by status when tab === "all" */
        <div className="space-y-8 mt-6">
          {tab === "all" ? (
            <>
              {(library.watchingItems || []).length > 0 && (
                <RailSection
                  title="Watching"
                  items={(library.watchingItems || []).map((i) => ({ ...i, status: "watching" as const }))}
                  library={library}
                  onOpen={onOpen}
                  onToggleWatchlist={onToggleWatchlist}
                  onToggleWatched={onToggleWatched}
                  onAddToWatching={onAddToWatching}
                  onAddToWaiting={onAddToWaiting}
                  onRemoveFromLibrary={onRemoveFromLibrary}
                />
              )}
              {(library.waitingItems || []).length > 0 && (
                <RailSection
                  title="Waiting"
                  items={(library.waitingItems || []).map((i) => ({ ...i, status: "waiting" as const }))}
                  library={library}
                  onOpen={onOpen}
                  onToggleWatchlist={onToggleWatchlist}
                  onToggleWatched={onToggleWatched}
                  onAddToWatching={onAddToWatching}
                  onAddToWaiting={onAddToWaiting}
                  onRemoveFromLibrary={onRemoveFromLibrary}
                />
              )}
              {library.watchlist.length > 0 && (
                <RailSection
                  title="Watchlist"
                  items={library.watchlist.map((i) => ({ ...i, status: "watchlist" as const }))}
                  library={library}
                  onOpen={onOpen}
                  onToggleWatchlist={onToggleWatchlist}
                  onToggleWatched={onToggleWatched}
                  onAddToWatching={onAddToWatching}
                  onAddToWaiting={onAddToWaiting}
                  onRemoveFromLibrary={onRemoveFromLibrary}
                />
              )}
              {library.watched.length > 0 && (
                <RailSection
                  title="Watched"
                  items={library.watched.map((i) => ({ ...i, status: "watched" as const }))}
                  library={library}
                  onOpen={onOpen}
                  onToggleWatchlist={onToggleWatchlist}
                  onToggleWatched={onToggleWatched}
                  onAddToWatching={onAddToWatching}
                  onAddToWaiting={onAddToWaiting}
                  onRemoveFromLibrary={onRemoveFromLibrary}
                />
              )}
            </>
          ) : (
            <RailSection
              title={TABS.find((t) => t.key === tab)?.label || ""}
              items={sortedItems}
              library={library}
              onOpen={onOpen}
              onToggleWatchlist={onToggleWatchlist}
              onToggleWatched={onToggleWatched}
              onAddToWatching={onAddToWatching}
              onAddToWaiting={onAddToWaiting}
              onRemoveFromLibrary={onRemoveFromLibrary}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── RotatingQuoteLine — inline animated quote below stats ──────────────────

function RotatingQuoteLine() {
  const quote = useRotatingQuote(9000);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={quote.quote}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 6 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="mt-3 flex items-baseline gap-2"
      >
        <Star size={10} className="shrink-0 translate-y-[1px] text-[#e8a020]/50" />
        <blockquote className="text-[11px] italic text-white/30 leading-snug">
          "{quote.quote}"
          <cite className="ml-1.5 not-italic text-white/20 text-[10px]">
            — {quote.character},{" "}
            <span className="text-[#e8a020]/35">{quote.show}</span>
          </cite>
        </blockquote>
      </motion.div>
    </AnimatePresence>
  );
}

// ── RailSection — horizontal scrollable row grouped by status ──────────────

function RailSection({
  title,
  items,
  library,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onAddToWatching,
  onAddToWaiting,
  onRemoveFromLibrary,
}: {
  title: string;
  items: AnnotatedItem[];
  library: UserLibrary;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWatching: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWaiting: (item: LibraryItem, mediaType: MediaType) => void;
  onRemoveFromLibrary: (item: LibraryItem, mediaType: MediaType) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <div className="shrink-0">
          <div className="mb-[4px] h-px w-5 bg-[#e8a020]/55" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">{title}</h3>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.05] to-transparent" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {items.map((item) => {
          const k = keyFor(item);
          return (
            <div key={k} className="w-[120px] shrink-0 sm:w-[140px]">
              <CatalogGridCard
                item={item}
                status={item.status}
                userRating={library.ratings[k]}
                onOpen={() => onOpen(item, item.mediaType)}
                onToggleWatchlist={() => onToggleWatchlist(item, item.mediaType)}
                onToggleWatched={() => onToggleWatched(item, item.mediaType)}
                onWatching={() => onAddToWatching(item, item.mediaType)}
                onWaiting={() => onAddToWaiting(item, item.mediaType)}
                onRemove={() => onRemoveFromLibrary(item, item.mediaType)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
