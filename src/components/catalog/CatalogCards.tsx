import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, Clock, Film, MoreHorizontal, Play, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { POSTER_BASE } from "../../config";
import type { LibraryItem } from "../../types";

// ── Catalog local types ───────────────────────────────────────────────────────
export type CatalogTab  = "all" | "watchlist" | "watching" | "waiting" | "watched";
export type CatalogView = "grid" | "list" | "rail";
export type CatalogSort = "added" | "title" | "year" | "rating";
export type MediaFilter = "all" | "movie" | "tv" | "anime";
export type AnnotatedItem = LibraryItem & { status: "watchlist" | "watching" | "waiting" | "watched" };

const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

// ── CatalogStatusBadge ────────────────────────────────────────────────────────
export function CatalogStatusBadge({
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
          "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
          compact
            ? "bg-[#e8a020]/22 px-[5px] py-[3px] text-[11px] text-[#e8a020]"
            : "border border-[#e8a020]/25 bg-[#e8a020]/12 px-2 py-[3px] text-[10px] text-[#e8a020]",
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
          "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
          compact
            ? "bg-cyan-500/22 px-[5px] py-[3px] text-[11px] text-cyan-400"
            : "border border-cyan-500/25 bg-cyan-500/12 px-2 py-[3px] text-[10px] text-cyan-400",
        )}
      >
        <Play size={compact ? 6 : 8} fill="currentColor" />
        {!compact && "Watching"}
      </span>
    );
  if (status === "waiting")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
          compact
            ? "bg-amber-500/22 px-[5px] py-[3px] text-[11px] text-amber-400"
            : "border border-amber-500/25 bg-amber-500/12 px-2 py-[3px] text-[10px] text-amber-400",
        )}
      >
        <Clock size={compact ? 6 : 8} />
        {!compact && "Waiting"}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
        compact
          ? "bg-white/14 px-[5px] py-[3px] text-[11px] text-white/50"
          : "border border-white/12 bg-white/8 px-2 py-[3px] text-[10px] text-white/50",
      )}
    >
      <Check size={compact ? 6 : 8} />
      {!compact && "Watched"}
    </span>
  );
}

// ── CatalogGridCard ───────────────────────────────────────────────────────────
export function CatalogGridCard({
  item, status, userRating, onOpen, onToggleWatchlist, onToggleWatched, onWatching, onWaiting, onRemove,
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
  const displayRating = userRating ?? item.rating;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Status-specific subtle ring — signals status at a glance before hover
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
        "group relative aspect-[2/3] cursor-pointer rounded-[12px] bg-white/[0.04] transition-all duration-300",
        statusRing,
      )}
      onClick={onOpen}
    >
      {/* Inner poster area — clipped to card boundary */}
      <div className="absolute inset-0 overflow-hidden rounded-[12px]">
        {/* Poster image */}
        {item.posterPath ? (
          <img
            src={`${POSTER_BASE}${item.posterPath}`}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
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
          <p className="text-[12px] font-semibold leading-snug text-white line-clamp-2">{item.title}</p>
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
            {displayRating != null && displayRating > 0 && (
              <>
                <span className="text-[11px] text-white/18">·</span>
                <span className="text-[11px] font-semibold text-[#e8a020]">★ {displayRating.toFixed(1)}</span>
              </>
            )}
          </div>
        </div>

        {/* Compact status badge — top-left */}
        <div className="absolute left-1.5 top-1.5">
          <CatalogStatusBadge status={status} compact />
        </div>

        {/* Watchlist: thin gold shimmer line at top */}
        {status === "watchlist" && (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#e8a020]/55 to-transparent" />
        )}

        {/* Watching: cyan progress strip at bottom */}
        {status === "watching" && (
          <div className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-black/30">
            <div className="h-full w-[52%] rounded-r-full bg-cyan-400/75" />
          </div>
        )}

        {/* Waiting: amber top strip */}
        {status === "waiting" && (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />
        )}
      </div>

      {/* Mobile: always-visible ⋯ menu button */}
      {IS_MOBILE && (
        <button
          onClick={(e) => { e.stopPropagation(); setMobileMenuOpen((v) => !v); }}
          className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/75 backdrop-blur-sm transition active:scale-90"
        >
          <MoreHorizontal size={13} />
        </button>
      )}

      {/* Mobile quick-action sheet (shown on ⋯ tap) */}
      <AnimatePresence>
        {IS_MOBILE && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1 rounded-b-[12px] bg-[#0d0f16]/97 px-2 py-2.5 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={(e) => { e.stopPropagation(); onOpen(); setMobileMenuOpen(false); }}
              className="w-full rounded-[7px] bg-[#e8a020] py-2 text-[11px] font-bold text-black active:opacity-80">
              Open Details
            </button>
            <div className="flex gap-1">
              {status !== "watched" && (
                <button onClick={(e) => { e.stopPropagation(); onToggleWatched(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] bg-emerald-600/90 py-1.5 text-[10px] font-bold text-white active:opacity-80">
                  ✓ Watched
                </button>
              )}
              {status !== "watching" && (
                <button onClick={(e) => { e.stopPropagation(); onWatching(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] bg-cyan-700/90 py-1.5 text-[10px] font-bold text-white active:opacity-80">
                  ▶ Watching
                </button>
              )}
              {status !== "waiting" && (
                <button onClick={(e) => { e.stopPropagation(); onWaiting(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] bg-amber-700/90 py-1.5 text-[10px] font-bold text-white active:opacity-80">
                  ⏳ Wait
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {status !== "watchlist" && (
                <button onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] border border-[#e8a020]/40 bg-[#e8a020]/10 py-1.5 text-[10px] font-semibold text-[#e8a020] active:opacity-80">
                  + List
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onRemove(); setMobileMenuOpen(false); }}
                className="flex-1 rounded-[7px] bg-white/[0.05] py-1.5 text-[10px] font-semibold text-red-400/80 active:opacity-80">
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: Dark action tray — slides up from below the card on hover */}
      <div
        className="absolute inset-x-0 bottom-0 translate-y-full rounded-b-[12px] bg-[#0d0f16]/96 px-2 py-2.5 backdrop-blur-md transition-transform duration-200 ease-out group-hover:translate-y-0 hidden md:flex flex-col gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Open Details — gold primary */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="w-full rounded-[7px] bg-[#e8a020] py-1.5 text-[10.5px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          Open Details
        </button>
        <div className="flex gap-1">
          {/* Mark Watched */}
          {status !== "watched" && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
              className="flex-1 rounded-[7px] bg-emerald-600/90 py-1.5 text-[10px] font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
            >
              ✓ Watched
            </button>
          )}
          {/* Watching */}
          {status !== "watching" && (
            <button
              onClick={(e) => { e.stopPropagation(); onWatching(); }}
              className="flex-1 rounded-[7px] bg-cyan-700/90 py-1.5 text-[10px] font-bold text-white transition hover:bg-cyan-600 active:scale-[0.98]"
            >
              ▶ Watching
            </button>
          )}
          {/* Waiting */}
          {status !== "waiting" && (
            <button
              onClick={(e) => { e.stopPropagation(); onWaiting(); }}
              className="flex-1 rounded-[7px] bg-amber-700/90 py-1.5 text-[10px] font-bold text-white transition hover:bg-amber-600 active:scale-[0.98]"
            >
              ⏳ Wait
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {/* Watchlist */}
          {status !== "watchlist" && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
              className="flex-1 rounded-[7px] border border-[#e8a020]/40 bg-[#e8a020]/10 py-1.5 text-[10px] font-semibold text-[#e8a020] transition hover:bg-[#e8a020]/20 active:scale-[0.98]"
            >
              + List
            </button>
          )}
          {/* Remove */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex-1 rounded-[7px] bg-white/[0.05] py-1.5 text-[10px] font-semibold text-red-400/80 transition hover:bg-red-700/30 hover:text-red-300 active:scale-[0.98]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CatalogListRow ────────────────────────────────────────────────────────────
export function CatalogListRow({
  item, status, userRating, watching, onOpen, onToggleWatchlist, onToggleWatched, onWatching, onWaiting, onRemove,
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
  const displayRating = userRating ?? item.rating;
  const accentClass =
    status === "watchlist"
      ? "bg-[#e8a020]/65"
      : status === "watching"
      ? "bg-cyan-400/65"
      : status === "waiting"
      ? "bg-amber-400/65"
      : "bg-white/18";

  return (
    <div className="group relative flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors duration-150 hover:bg-white/[0.04]">
      {/* Left status accent strip — visible on hover */}
      <div
        className={cn(
          "absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          accentClass,
        )}
      />

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
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{item.title}</p>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-[10px] font-medium text-white/32">
            {item.mediaType === "tv" ? "TV" : "Film"}
          </span>
          {item.year && item.year !== "—" && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="text-[10px] text-white/32">{item.year}</span>
            </>
          )}
          {displayRating != null && displayRating > 0 && (
            <>
              <span className="text-[11px] text-white/18">·</span>
              <span className="text-[10px] font-semibold text-[#e8a020]">★ {displayRating.toFixed(1)}</span>
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

      {/* Status badge — hidden on xs, visible sm+ */}
      <div className="hidden shrink-0 sm:block">
        <CatalogStatusBadge status={status} />
      </div>

      {/* Action buttons — always visible for touch accessibility */}
      <div className="flex shrink-0 items-center gap-1.5">
        {status !== "watched" && (
          <button
            onClick={onToggleWatched}
            title="Mark Watched"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/80 text-white transition hover:bg-emerald-500 active:scale-90"
          >
            <Check size={13} />
          </button>
        )}
        {status !== "watching" && (
          <button
            onClick={onWatching}
            title="Mark as Watching"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700/80 text-white transition hover:bg-cyan-600 active:scale-90"
          >
            <Play size={12} />
          </button>
        )}
        {status !== "waiting" && (
          <button
            onClick={onWaiting}
            title="Move to Waiting"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700/80 text-white transition hover:bg-amber-600 active:scale-90"
          >
            <Clock size={12} />
          </button>
        )}
        {status !== "watchlist" && (
          <button
            onClick={onToggleWatchlist}
            title="Add to Watchlist"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8a020]/20 text-[#e8a020] transition hover:bg-[#e8a020]/35 active:scale-90"
          >
            <Bookmark size={12} />
          </button>
        )}
        <button
          onClick={onRemove}
          title="Remove"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700/60 text-red-200 transition hover:bg-red-600/80 active:scale-90"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
