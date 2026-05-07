// ─────────────────────────────────────────────────────────────────────────────
// GoodFilm — My Library / Cinematheque View
// Redesign: editorial masthead · caption-below cards · right sidebar accordion
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
type AnnotatedItem = LibraryItem & { status: "watchlist" | "watching" | "waiting" | "watched" };

const SERIF = "'Fraunces', 'Times New Roman', serif";
const MONO  = "'JetBrains Mono', 'Courier New', monospace";

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

function CatalogStatusBadge({ status, compact = false }: {
  status: "watchlist" | "watching" | "waiting" | "watched"; compact?: boolean;
}) {
  if (status === "watchlist")
    return (
      <span className={cn("inline-flex items-center gap-[3px] font-semibold leading-none",
        compact ? "rounded-full bg-[#e8a020]/22 px-[5px] py-[3px] text-[11px] text-[#e8a020]"
                : "rounded-[5px] border border-[#e8a020]/22 bg-[#e8a020]/10 px-2 py-[3px] text-[10px] text-[#e8a020] shadow-[inset_2px_0_0_0_rgba(239,180,63,0.45)]")}>
        <Bookmark size={compact ? 6 : 8} fill="currentColor" />{!compact && "To Watch"}
      </span>
    );
  if (status === "watching")
    return (
      <span className={cn("inline-flex items-center font-semibold leading-none",
        compact ? "gap-[3px] rounded-full bg-cyan-500/22 px-[5px] py-[3px] text-[11px] text-cyan-400"
                : "gap-1.5 rounded-[5px] border border-cyan-500/22 bg-cyan-500/10 py-[3px] pl-1.5 pr-2 text-[10px] text-cyan-400 shadow-[inset_2px_0_0_0_rgba(34,211,238,0.45)]")}>
        {compact ? <Play size={6} fill="currentColor" /> : (
          <span className="relative flex h-[7px] w-[7px] shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/70" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-cyan-400" />
          </span>
        )}{!compact && "Watching"}
      </span>
    );
  if (status === "waiting")
    return (
      <span className={cn("inline-flex items-center gap-[3px] font-semibold leading-none",
        compact ? "rounded-full bg-amber-500/22 px-[5px] py-[3px] text-[11px] text-amber-400"
                : "rounded-[5px] border border-amber-500/22 bg-amber-500/10 px-2 py-[3px] text-[10px] text-amber-400 shadow-[inset_2px_0_0_0_rgba(251,191,36,0.45)]")}>
        <Clock size={compact ? 6 : 8} />{!compact && "Waiting"}
      </span>
    );
  return (
    <span className={cn("inline-flex items-center gap-[3px] font-semibold leading-none",
      compact ? "rounded-full bg-white/14 px-[5px] py-[3px] text-[11px] text-white/50"
              : "rounded-[5px] border border-white/10 bg-white/[0.06] px-2 py-[3px] text-[10px] text-white/45 shadow-[inset_2px_0_0_0_rgba(255,255,255,0.12)]")}>
      <Check size={compact ? 6 : 8} />{!compact && "Watched"}
    </span>
  );
}

// ── CinemathequeGridCard ──────────────────────────────────────────────────────
// Editorial caption-below card: left status border, monospace badge, hover tray.

function CinemathequeGridCard({ item, status, userRating, onOpen, onToggleWatchlist, onToggleWatched, onWatching, onWaiting, onRemove }: {
  item: AnnotatedItem; status: "watchlist" | "watching" | "waiting" | "watched";
  userRating?: number; onOpen: () => void; onToggleWatchlist: () => void;
  onToggleWatched: () => void; onWatching: () => void; onWaiting: () => void; onRemove: () => void;
}) {
  const leftBorder =
    status === "watchlist" ? "border-l-2 border-l-[#d49636]"
    : status === "watching" ? "border-l-2 border-l-[#5fb8c4]"
    : status === "waiting"  ? "border-l-2 border-l-[#d4a32d]"
    : "";
  const badgeColors: Record<typeof status, string> = {
    watchlist: "text-[#d49636] border-[rgba(212,150,54,0.35)]",
    watching:  "text-[#7dc8d2] border-[rgba(125,200,210,0.35)]",
    waiting:   "text-[#d4a32d] border-[rgba(212,163,45,0.30)]",
    watched:   "text-white/55 border-white/10",
  };
  const badgeLabels: Record<typeof status, string> = {
    watchlist: "TO WATCH", watching: "WATCHING", waiting: "WAITING", watched: "WATCHED",
  };
  const displayRating = userRating ?? item.rating;

  return (
    <div className="group flex flex-col cursor-pointer" onClick={onOpen}>
      {/* Poster container */}
      <div className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-[2px] border border-[rgba(245,239,225,0.08)] transition-colors duration-[250ms] group-hover:border-[rgba(212,150,54,0.45)]",
        leftBorder,
      )} style={{ background: "var(--gf-bg-card)" }}>
        {item.posterPath ? (
          <img
            src={`${POSTER_BASE}${item.posterPath}`}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ filter: "saturate(0.85) contrast(1.05)" }}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2.5"
            style={{ background: "repeating-linear-gradient(45deg,rgba(245,239,225,0.015) 0 12px,transparent 12px 24px),var(--gf-bg-card)" }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 28, color: "var(--gf-dim)", opacity: 0.55 }}>🎬</span>
            <p className="px-3 text-center text-[11px] leading-snug text-white/22" style={{ fontFamily: SERIF, fontStyle: "italic" }}>{item.title}</p>
          </div>
        )}

        {/* Status badge — top right, monospace */}
        <span
          className={cn("absolute right-2 top-2 z-10 inline-flex items-center border px-1.5 py-1 text-[8px] leading-none tracking-[0.16em]", badgeColors[status])}
          style={{ fontFamily: MONO, background: "rgba(10,8,7,0.78)", backdropFilter: "blur(6px)" }}
        >
          {badgeLabels[status]}
        </span>

        {/* Hover tray — slides up from bottom */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex translate-y-full flex-col gap-1 border-t border-[rgba(212,150,54,0.30)] p-2.5 transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
          style={{ background: "rgba(10,8,7,0.94)", backdropFilter: "blur(10px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="w-full py-[7px] text-[9px] font-semibold uppercase tracking-[0.18em] transition hover:brightness-110"
            style={{ fontFamily: MONO, background: "var(--gf-amber)", color: "#110e0b" }}
          >
            Open Details
          </button>
          <div className="flex gap-1">
            {status !== "watched"   && <button onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}  className="flex-1 border border-[rgba(142,209,165,0.25)] py-[5px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#8ed1a5] transition hover:bg-white/[0.06]" style={{ fontFamily: MONO }}>✓ Watched</button>}
            {status !== "watching"  && <button onClick={(e) => { e.stopPropagation(); onWatching(); }}        className="flex-1 border border-[rgba(125,200,210,0.25)] py-[5px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7dc8d2] transition hover:bg-white/[0.06]" style={{ fontFamily: MONO }}>▶ Watch</button>}
            {status !== "waiting"   && <button onClick={(e) => { e.stopPropagation(); onWaiting(); }}         className="flex-1 border border-[rgba(212,163,45,0.25)] py-[5px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#d4a32d] transition hover:bg-white/[0.06]" style={{ fontFamily: MONO }}>⏳ Wait</button>}
          </div>
          <div className="flex gap-1">
            {status !== "watchlist" && <button onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }} className="flex-1 border border-[rgba(212,150,54,0.30)] py-[5px] text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--gf-amber)] transition hover:bg-white/[0.06]" style={{ fontFamily: MONO }}>+ List</button>}
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="flex-1 border border-[rgba(220,140,140,0.18)] py-[5px] text-[8px] font-medium uppercase tracking-[0.12em] text-[rgba(220,140,140,0.85)] transition hover:bg-white/[0.06]" style={{ fontFamily: MONO }}>Remove</button>
          </div>
        </div>
      </div>

      {/* Caption below poster */}
      <div className="pt-2.5">
        <p className="mb-1.5 line-clamp-2 text-[14px] font-medium leading-[1.18] tracking-[-0.005em] text-[var(--gf-cream)]" style={{ fontFamily: SERIF }}>{item.title}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--gf-muted)]" style={{ fontFamily: MONO }}>
            {item.mediaType === "tv" ? "TV" : "Film"}
          </span>
          {item.year && item.year !== "—" && (
            <span className="text-[9px] tracking-[0.08em] text-[var(--gf-dim)]" style={{ fontFamily: MONO }}>{item.year}</span>
          )}
          {displayRating != null && displayRating > 0 && (
            <span className="ml-auto text-[10px] font-medium tracking-[0.04em] text-[var(--gf-amber)]" style={{ fontFamily: MONO }}>★ {displayRating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CatalogListRow ────────────────────────────────────────────────────────────

function CatalogListRow({ item, status, userRating, watching, onOpen, onToggleWatchlist, onToggleWatched, onWatching, onWaiting, onRemove }: {
  item: AnnotatedItem; status: "watchlist" | "watching" | "waiting" | "watched";
  userRating?: number; watching?: { season: number; watchedEpisodes: number };
  onOpen: () => void; onToggleWatchlist: () => void; onToggleWatched: () => void;
  onWatching: () => void; onWaiting: () => void; onRemove: () => void;
}) {
  const accentClass =
    status === "watchlist" ? "bg-[#e8a020]/65"
    : status === "watching" ? "bg-cyan-400/65"
    : status === "waiting"  ? "bg-amber-400/65"
    : "bg-white/18";
  return (
    <div className="group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.05]">
      <div className={cn("absolute bottom-1.5 left-0 top-1.5 w-[2.5px] rounded-r-full opacity-[0.18] transition-all duration-200 group-hover:opacity-75", accentClass)} />
      <div className="pointer-events-none absolute inset-0 rounded-[10px] bg-gradient-to-r from-white/[0.015] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="h-[58px] w-[40px] shrink-0 cursor-pointer overflow-hidden rounded-[7px] bg-white/[0.06]" onClick={onOpen}>
        {item.posterPath ? (
          <img src={`${POSTER_BASE}${item.posterPath}`} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><Film size={13} className="text-white/18" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <p className="truncate text-[13px] font-semibold leading-tight text-white">
          {item.title}
          {item.year && item.year !== "—" && <span className="ml-1 text-[11px] font-normal text-white/35">({item.year})</span>}
        </p>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-[10px] font-medium text-white/32">{item.mediaType === "tv" ? "TV" : "Film"}</span>
          {item.rating != null && item.rating > 0 && (
            <><span className="text-[11px] text-white/18">·</span>
            <span className="inline-flex items-center gap-[2px] text-[10px] text-white/40"><Star size={8} className="text-white/28" />{item.rating.toFixed(1)}</span></>
          )}
          {userRating != null && userRating > 0 && (
            <><span className="text-[11px] text-white/18">·</span>
            <span className="inline-flex items-center gap-[2px] text-[10px] font-semibold text-[#e8a020]"><Star size={8} fill="currentColor" />{userRating.toFixed(1)}</span></>
          )}
          {watching && item.mediaType === "tv" && (
            <><span className="text-[11px] text-white/18">·</span>
            <span className="text-[10px] text-cyan-400">S{watching.season} · {watching.watchedEpisodes} ep</span></>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 sm:block"><CatalogStatusBadge status={status} /></div>
      <div className="flex shrink-0 translate-x-2 items-center gap-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {status !== "watched"   && <button onClick={onToggleWatched}  title="Mark Watched" className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/80 text-white transition hover:bg-emerald-500"><Check size={12} /></button>}
        {status !== "watching"  && <button onClick={onWatching}       title="Watching"     className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-700/80 text-white transition hover:bg-cyan-600"><Play size={11} /></button>}
        {status !== "waiting"   && <button onClick={onWaiting}        title="Waiting"      className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/80 text-white transition hover:bg-amber-600"><Clock size={11} /></button>}
        {status !== "watchlist" && <button onClick={onToggleWatchlist} title="Watchlist"   className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8a020]/20 text-[#e8a020] transition hover:bg-[#e8a020]/35"><Bookmark size={11} /></button>}
        <button onClick={onRemove} title="Remove" className="flex h-7 w-7 items-center justify-center rounded-full bg-red-700/60 text-red-200 transition hover:bg-red-600/80"><X size={12} /></button>
      </div>
    </div>
  );
}

// ── LibrarySidebar ────────────────────────────────────────────────────────────
// Right accordion: collapsible sections per status with media sub-counts.

function LibrarySidebar({ allItems, activeTab, activeMedia, isAnime, onSelect }: {
  allItems: AnnotatedItem[]; activeTab: CatalogTab; activeMedia: MediaFilter;
  isAnime: (item: AnnotatedItem) => boolean;
  onSelect: (tab: CatalogTab, media: MediaFilter) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ all: true, watchlist: true, watching: true, waiting: true, watched: true });
  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const counts = (statusFilter: CatalogTab) => {
    const base = statusFilter === "all" ? allItems : allItems.filter((i) => i.status === statusFilter);
    return {
      all:   base.length,
      movie: base.filter((i) => i.mediaType === "movie" && !isAnime(i)).length,
      tv:    base.filter((i) => i.mediaType === "tv" && !isAnime(i)).length,
      anime: base.filter((i) => isAnime(i)).length,
    };
  };

  const SECTIONS: Array<{ key: CatalogTab; label: string; dot: string }> = [
    { key: "all",       label: "All",       dot: "rgba(154,142,122,0.7)" },
    { key: "watchlist", label: "Watchlist", dot: "#d49636" },
    { key: "watching",  label: "Watching",  dot: "#22d3ee" },
    { key: "waiting",   label: "Waiting",   dot: "#f59e0b" },
    { key: "watched",   label: "Watched",   dot: "rgba(255,255,255,0.3)" },
  ];
  const SUB: Array<{ key: "movie" | "tv" | "anime"; label: string }> = [
    { key: "movie", label: "Movies" },
    { key: "tv",    label: "TV Shows" },
    { key: "anime", label: "Anime" },
  ];

  return (
    <aside className="hidden lg:block w-[210px] shrink-0 sticky top-[110px] max-h-[calc(100vh-120px)] overflow-y-auto border-l border-[rgba(255,240,210,0.06)] ml-5 pl-4 py-1 [scrollbar-width:none]">
      {SECTIONS.map((sec, i) => {
        const c = counts(sec.key);
        if (c.all === 0 && sec.key !== "all") return null;
        const isActiveSec = activeTab === sec.key;
        return (
          <div key={sec.key} className="mb-1.5">
            {i > 0 && <div className="mx-2 my-2 h-px bg-[rgba(255,240,210,0.06)]" />}
            <button
              className="flex w-full items-center justify-between rounded-[7px] px-2 py-1.5 transition hover:bg-white/[0.04]"
              onClick={() => toggle(sec.key)}
            >
              <span className="flex items-center gap-2 text-[9.5px] font-medium uppercase tracking-[0.18em]"
                style={{ fontFamily: MONO, color: isActiveSec ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)" }}>
                <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: sec.dot, opacity: isActiveSec ? 1 : 0.5 }} />
                {sec.label}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[9px] tracking-[0.1em]" style={{ fontFamily: MONO, color: "var(--gf-muted)" }}>{c.all}</span>
                <ChevronRight size={8} className={cn("text-white/20 transition-transform duration-150", open[sec.key] && "rotate-90")} />
              </span>
            </button>
            {open[sec.key] && (
              <div className="py-0.5">
                {SUB.map((sub) => {
                  const cnt = c[sub.key];
                  if (cnt === 0) return null;
                  const isActive = activeTab === sec.key && activeMedia === sub.key;
                  return (
                    <button
                      key={sub.key}
                      className={cn("flex w-full items-center justify-between rounded-[6px] py-[5px] pl-[22px] pr-2 transition hover:bg-white/[0.04]", isActive && "bg-white/[0.07]")}
                      onClick={() => onSelect(sec.key, sub.key)}
                    >
                      <span className={cn("text-[13px] italic transition-colors", isActive ? "font-semibold text-[var(--gf-cream)]" : "font-normal text-white/45")} style={{ fontFamily: SERIF }}>{sub.label}</span>
                      <span className={cn("text-[9px] tracking-[0.08em]", isActive ? "text-[var(--gf-amber)]" : "text-[var(--gf-dim)]")} style={{ fontFamily: MONO }}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

// ── RotatingQuoteLine ─────────────────────────────────────────────────────────

function RotatingQuoteLine() {
  const quote = useRotatingQuote(9000);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={quote.quote} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="mt-3 flex items-baseline gap-2">
        <Star size={10} className="shrink-0 translate-y-[1px] text-[#e8a020]/50" />
        <blockquote className="text-[11px] italic leading-snug text-white/30">
          "{quote.quote}"
          <cite className="ml-1.5 text-[10px] not-italic text-white/20">— {quote.character}, <span className="text-[#e8a020]/35">{quote.show}</span></cite>
        </blockquote>
      </motion.div>
    </AnimatePresence>
  );
}

// ── RailSection ───────────────────────────────────────────────────────────────

function RailSection({ title, items, library, onOpen, onToggleWatchlist, onToggleWatched, onAddToWatching, onAddToWaiting, onRemoveFromLibrary }: {
  title: string; items: AnnotatedItem[]; library: UserLibrary;
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
              <CinemathequeGridCard
                item={item} status={item.status} userRating={library.ratings[k]}
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

// ── MyListView — main export ──────────────────────────────────────────────────

export function MyListView({
  library, watchlistKeys, watchedKeys, watchingKeys, waitingKeys,
  onOpen, onToggleWatchlist, onToggleWatched, onAddToWatching, onAddToWaiting,
  onRemoveFromLibrary, onExport, onImport, appLanguage: _appLanguage, initialTab,
}: {
  library: UserLibrary; watchlistKeys: Set<string>; watchedKeys: Set<string>;
  watchingKeys: Set<string>; waitingKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWatching: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWaiting: (item: LibraryItem, mediaType: MediaType) => void;
  onRemoveFromLibrary: (item: LibraryItem, mediaType: MediaType) => void;
  onExport: () => void; onImport: (file: File) => void;
  appLanguage?: AppLanguage; initialTab?: CatalogTab;
}) {
  const [tab, setTab]               = useState<CatalogTab>(() => initialTab || "all");
  const [viewMode, setViewMode]     = useState<CatalogView>("grid");
  const [sortBy, setSortBy]         = useState<CatalogSort>("added");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [query, setQuery]           = useState("");
  const [randomPick, setRandomPick] = useState<AnnotatedItem | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  const isAnime = useCallback(
    (item: AnnotatedItem) => item.genre_ids?.includes(16) || item.genres?.some((g) => g.id === 16) || false,
    [],
  );

  const allItems = useMemo<AnnotatedItem[]>(() => {
    const seen = new Set<string>(); const result: AnnotatedItem[] = [];
    (library.watchingItems || []).forEach((item) => { const k = keyFor(item); if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watching" }); } });
    (library.waitingItems  || []).forEach((item) => { const k = keyFor(item); if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "waiting"  }); } });
    library.watchlist.forEach((item) =>              { const k = keyFor(item); if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watchlist" }); } });
    library.watched.forEach((item)   =>              { const k = keyFor(item); if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watched"   }); } });
    return result;
  }, [library.watchlist, library.watched, library.watchingItems, library.waitingItems]);

  const tabItems = useMemo(
    () => tab === "all" ? allItems : allItems.filter((i) => i.status === tab),
    [allItems, tab],
  );

  const filteredItems = useMemo(() => {
    let items = tabItems;
    if (mediaFilter === "anime")      items = items.filter((i) => isAnime(i));
    else if (mediaFilter === "tv")    items = items.filter((i) => i.mediaType === "tv" && !isAnime(i));
    else if (mediaFilter === "movie") items = items.filter((i) => i.mediaType === "movie" && !isAnime(i));
    if (query.trim()) { const q = query.toLowerCase(); items = items.filter((i) => i.title.toLowerCase().includes(q)); }
    return items;
  }, [tabItems, mediaFilter, query, isAnime]);

  const sortedItems = useMemo<AnnotatedItem[]>(() => {
    const arr = [...filteredItems];
    if (sortBy === "title")       arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "year")   arr.sort((a, b) => (b.year || "0").localeCompare(a.year || "0"));
    else if (sortBy === "rating") arr.sort((a, b) => (library.ratings[keyFor(b)] ?? -1) - (library.ratings[keyFor(a)] ?? -1));
    return arr;
  }, [filteredItems, sortBy, library.ratings]);

  const stats = useMemo(() => {
    const movies = allItems.filter((i) => i.mediaType === "movie" && !isAnime(i)).length;
    const tv     = allItems.filter((i) => i.mediaType === "tv"    && !isAnime(i)).length;
    const anime  = allItems.filter((i) => isAnime(i)).length;
    const rated  = allItems.filter((i) => library.ratings[keyFor(i)] != null);
    const avgRating = rated.length > 0 ? rated.reduce((s, i) => s + (library.ratings[keyFor(i)] || 0), 0) / rated.length : null;
    return { total: allItems.length, movies, tv, anime, avgRating };
  }, [allItems, library.ratings, isAnime]);

  const shuffle = () => { if (sortedItems.length) setRandomPick(sortedItems[Math.floor(Math.random() * sortedItems.length)]); };

  const sortLabels: Record<CatalogSort, string> = { added: "Date Added", title: "Title A→Z", year: "Release Date", rating: "My Rating" };

  const TABS: Array<{ key: CatalogTab; label: string; count: number }> = [
    { key: "all",       label: "All",       count: allItems.length },
    { key: "watchlist", label: "Watchlist", count: library.watchlist.length },
    { key: "watching",  label: "Watching",  count: (library.watchingItems || []).length },
    { key: "waiting",   label: "Waiting",   count: (library.waitingItems  || []).length },
    { key: "watched",   label: "Watched",   count: library.watched.length },
  ];

  const tabAccentLine  = (k: CatalogTab) => k === "watching" ? "bg-cyan-400" : k === "waiting" ? "bg-amber-400" : k === "watched" ? "bg-white/40" : "bg-[#e8a020]";
  const tabBadgeActive = (k: CatalogTab) => k === "watching" ? "bg-cyan-500/22 text-cyan-400" : k === "waiting" ? "bg-amber-500/22 text-amber-400" : k === "watched" ? "bg-white/14 text-white/60" : "bg-[#e8a020]/22 text-[#e8a020]";

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  return (
    <div className="pb-8">

      {/* ══ EDITORIAL MASTHEAD ══════════════════════════════════════════════ */}
      <div className="relative -mx-3 overflow-hidden border-b border-[rgba(245,239,225,0.08)] px-3 pb-10 pt-14 sm:-mx-5 sm:px-5 lg:-mx-10 lg:px-10 xl:-mx-14 xl:px-14">
        {/* Amber rule — at top of masthead */}
        <div className="mb-7 h-px w-full bg-[var(--gf-amber)] opacity-55" />

        {/* Eyebrow */}
        <div className="mb-[18px] flex items-center gap-3.5" style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gf-muted)" }}>
          <span style={{ color: "var(--gf-amber)" }}>№ 001</span>
          <span className="inline-block h-px w-4 bg-[rgba(245,239,225,0.08)]" />
          <span>Volume {String(stats.total).padStart(3, "0")}</span>
          <span className="inline-block h-px w-4 bg-[rgba(245,239,225,0.08)]" />
          <span className="hidden sm:inline">{currentMonth}</span>
        </div>

        {/* Title + Stats grid */}
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[1fr_auto]">
          {/* Giant serif title */}
          <div>
            <h1 className="m-0 flex flex-wrap items-baseline gap-[0.18em] leading-[0.88] tracking-[-0.045em]" style={{ fontFamily: SERIF }}>
              <span style={{ fontStyle: "italic", fontWeight: 400, fontSize: "clamp(48px,7vw,96px)", color: "var(--gf-muted)" }}>The</span>
              <span style={{ fontStyle: "normal", fontWeight: 600, fontSize: "clamp(72px,11vw,156px)", color: "var(--gf-cream)" }}>Library</span>
            </h1>
            <p className="mt-[22px] text-[14px] italic text-[var(--gf-muted)]" style={{ fontFamily: SERIF }}>
              A personal cinematheque{" "}
              <span style={{ color: "var(--gf-amber)", margin: "0 6px" }}>·</span>
              curated collection
            </p>
          </div>

          {/* Stats + Export/Import */}
          <div className="shrink-0 pb-2">
            <div className="flex items-stretch border-b border-t border-[rgba(245,239,225,0.08)] py-4">
              {([
                { num: String(stats.movies).padStart(2, "0"), lbl: "Films",  amber: false },
                { num: String(stats.tv).padStart(2, "0"),     lbl: "Series", amber: false },
                { num: String(stats.anime).padStart(2, "0"),  lbl: "Anime",  amber: false },
                { num: stats.avgRating != null ? stats.avgRating.toFixed(1) : "—", lbl: "Avg ★", amber: true },
              ] as const).map((s, i) => (
                <React.Fragment key={s.lbl}>
                  {i > 0 && <div className="mx-0 h-7 w-px self-center bg-[rgba(245,239,225,0.08)]" />}
                  <div className="flex min-w-[64px] flex-col items-center gap-1.5 px-[22px]">
                    <span className="text-[28px] font-medium leading-none tracking-[-0.02em]"
                      style={{ fontFamily: SERIF, color: s.amber ? "var(--gf-amber)" : "var(--gf-cream)", fontStyle: s.amber ? "italic" : "normal", fontWeight: s.amber ? 400 : 500 }}>
                      {s.num}
                    </span>
                    <span className="text-[8.5px] font-medium uppercase tracking-[0.20em] text-[var(--gf-dim)]" style={{ fontFamily: MONO }}>{s.lbl}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={onExport} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/10 bg-white/[0.05] px-3 text-[11px] font-medium text-white/55 backdrop-blur-sm transition hover:bg-white/[0.09] hover:text-white">
                <Download size={11} /><span className="hidden sm:inline">Export</span>
              </button>
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] bg-[#e8a020] px-3 text-[11px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]">
                <Upload size={11} /><span>Import</span>
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ""; }} />
              </label>
            </div>
          </div>
        </div>

        {/* Tab row */}
        <div className="mt-8">
          <div className="flex items-end overflow-x-auto [scrollbar-width:none]">
            {TABS.map(({ key, label, count }) => {
              const isActive = tab === key;
              return (
                <button key={key} onClick={() => setTab(key)}
                  className={cn("relative flex shrink-0 items-center gap-2 px-3 pb-3.5 pt-2.5 text-[13px] transition-all duration-200 sm:px-4",
                    isActive ? "font-semibold text-white" : "font-medium text-white/35 hover:text-white/62")}>
                  <span>{label}</span>
                  <span className={cn("rounded-full px-[6px] py-[2px] text-[10px] font-bold leading-none tabular-nums transition-colors duration-200",
                    isActive ? tabBadgeActive(key) : "bg-white/6 text-white/28")}>{count}</span>
                  {isActive && (
                    <motion.div layoutId="catalog-tab-indicator"
                      className={cn("absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm", tabAccentLine(key))}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="h-px bg-white/[0.07]" />
        </div>
      </div>

      {/* ══ STICKY CONTROL BAR ══════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 -mx-3 border-b border-[rgba(245,239,225,0.08)] backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-10 lg:px-10 xl:-mx-14 xl:px-14"
        style={{ background: "rgba(10,8,7,0.94)" }}>
        {/* Search | spacer | shuffle | view-toggle | sort */}
        <div className="flex h-16 items-center gap-0 px-3 sm:px-0">
          <div className="relative min-w-[160px] flex-1" style={{ maxWidth: 480 }}>
            <Search size={12} className="pointer-events-none absolute left-[6px] top-1/2 -translate-y-1/2 text-[var(--gf-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalogue…"
              className="h-11 w-full bg-transparent pl-7 pr-8 text-[15px] text-[var(--gf-cream)] placeholder-white/32 outline-none transition-colors"
              style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, border: "none", borderBottom: `1px solid ${query ? "var(--gf-amber)" : "rgba(245,239,225,0.14)"}`, borderRadius: 0 }}
            />
            {query && <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--gf-muted)] transition hover:text-white"><X size={11} /></button>}
          </div>

          <div className="flex-1" />

          <button onClick={shuffle} title="Random pick" className="mx-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/8 bg-white/[0.03] text-white/42 transition hover:bg-white/[0.07] hover:text-[#e8a020]">
            <RefreshCw size={13} />
          </button>

          {/* View toggle — bordered left/right */}
          <div className="flex h-11 shrink-0 items-stretch border-x border-[rgba(245,239,225,0.08)]">
            {([["grid", "⊞"], ["list", "≡"], ["rail", "⋯"]] as const).map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={cn("flex min-w-[44px] items-center justify-center px-3 text-[16px] transition",
                  viewMode === mode ? "text-[var(--gf-amber)]" : "text-white/30 hover:text-white/70")}>
                {icon}
              </button>
            ))}
          </div>

          {/* Sort — "Sort —" mono prefix + serif italic label */}
          <div className="relative ml-0 shrink-0">
            <button onClick={() => setShowSortMenu((v) => !v)}
              className="flex h-11 items-center gap-2 px-4 transition hover:text-[var(--gf-amber)]"
              style={{ color: "rgba(245,239,225,0.55)", background: "transparent", border: "none" }}>
              <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--gf-dim)]" style={{ fontFamily: MONO }}>Sort —</span>
              <span className="text-[13px] italic" style={{ fontFamily: SERIF }}>{sortLabels[sortBy]}</span>
              <ChevronRight size={10} className="rotate-90 opacity-60" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[168px] border border-[rgba(245,239,225,0.10)] py-1.5 shadow-[0_24px_48px_rgba(0,0,0,0.7)]"
                style={{ background: "#110e0b" }}>
                {(Object.entries(sortLabels) as Array<[CatalogSort, string]>).map(([key, label]) => (
                  <button key={key} onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                    className={cn("block w-full px-3.5 py-2 text-left text-[13px] italic transition hover:bg-white/[0.04]",
                      sortBy === key ? "text-[var(--gf-amber)]" : "text-white/62")}
                    style={{ fontFamily: SERIF, background: "none", border: "none" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Media chips */}
        <div className="flex items-center overflow-x-auto px-3 [scrollbar-width:none] sm:px-0">
          {(["all", "movie", "tv", "anime"] as const).map((type) => (
            <button key={type} onClick={() => setMediaFilter(type)}
              className={cn("shrink-0 border-b-2 px-3 py-2.5 text-[11px] font-medium transition",
                mediaFilter === type
                  ? type === "anime" ? "border-[#ef8c43] text-[#ef8c43]" : "border-[var(--gf-amber)] text-white"
                  : "border-transparent text-white/38 hover:text-white/65")}>
              {type === "all" ? "All" : type === "movie" ? "Films" : type === "tv" ? "TV Shows" : "Anime"}
            </button>
          ))}
        </div>
      </div>

      {/* ══ RANDOM PICK BANNER ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {randomPick && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden rounded-[14px] border border-[#e8a020]/22 bg-[#e8a020]/7">
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
                <button onClick={() => { onOpen(randomPick, randomPick.mediaType); setRandomPick(null); }} className="rounded-[8px] bg-[#e8a020] px-3 py-1.5 text-[11px] font-bold text-black transition hover:brightness-110">Open</button>
                <button onClick={shuffle} className="rounded-[8px] border border-white/10 bg-white/[0.05] p-1.5 text-white/45 transition hover:text-white"><RefreshCw size={12} /></button>
                <button onClick={() => setRandomPick(null)} className="rounded-[8px] border border-white/10 bg-white/[0.05] p-1.5 text-white/32 transition hover:text-white"><X size={12} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MAIN CONTENT + RIGHT SIDEBAR ════════════════════════════════════ */}
      <div className="mt-5 flex items-start gap-0">
        <div className="min-w-0 flex-1">
          {/* Grid summary line */}
          {sortedItems.length > 0 && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9.5px] uppercase tracking-[0.16em]" style={{ fontFamily: MONO, color: "var(--gf-muted)" }}>
                <span style={{ color: "var(--gf-amber)" }}>{sortedItems.length}</span> titles
                {query && <span className="text-white/38"> · "{query}"</span>}
              </p>
              <p className="text-[9.5px] uppercase tracking-[0.16em] text-[var(--gf-dim)]" style={{ fontFamily: MONO }}>↕ {sortLabels[sortBy]}</p>
            </div>
          )}

          {/* Empty state */}
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-5xl opacity-12">{mediaFilter === "movie" ? "🎬" : mediaFilter === "tv" ? "📺" : mediaFilter === "anime" ? "✨" : "🎬"}</div>
              <p className="text-[15px] font-semibold text-white/42">
                {query ? `No results for "${query}"` : tab === "all" ? "Your library is empty" : tab === "waiting" ? "Nothing in Waiting" : `No ${tab} titles`}
              </p>
              <p className="mt-1.5 text-[13px] text-white/26">
                {query ? "Try a different search term" : tab === "waiting" ? "Move titles here when they're not released yet" : "Add movies and shows from the Home or Search tabs"}
              </p>
            </div>

          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-x-[18px] gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {sortedItems.map((item) => {
                const k = keyFor(item);
                return (
                  <CinemathequeGridCard key={k} item={item} status={item.status} userRating={library.ratings[k]}
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
            <div className="space-y-0">
              {sortedItems.map((item, index) => {
                const k = keyFor(item);
                const watchData = item.mediaType === "tv" ? library.watching[String(item.id)] : undefined;
                const progress = watchData
                  ? { season: watchData.season, watchedEpisodes: (watchData.watchedEpisodesBySeason?.[String(watchData.season)] || []).length }
                  : undefined;
                return (
                  <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.028, 0.42), duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                    <CatalogListRow item={item} status={item.status} userRating={library.ratings[k]} watching={progress}
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
            /* Rail view */
            <div className="mt-6 space-y-8">
              {tab === "all" ? (
                <>
                  {(library.watchingItems || []).length > 0 && <RailSection title="Watching"  items={(library.watchingItems || []).map((i) => ({ ...i, status: "watching"  as const }))} library={library} onOpen={onOpen} onToggleWatchlist={onToggleWatchlist} onToggleWatched={onToggleWatched} onAddToWatching={onAddToWatching} onAddToWaiting={onAddToWaiting} onRemoveFromLibrary={onRemoveFromLibrary} />}
                  {(library.waitingItems  || []).length > 0 && <RailSection title="Waiting"   items={(library.waitingItems  || []).map((i) => ({ ...i, status: "waiting"   as const }))} library={library} onOpen={onOpen} onToggleWatchlist={onToggleWatchlist} onToggleWatched={onToggleWatched} onAddToWatching={onAddToWatching} onAddToWaiting={onAddToWaiting} onRemoveFromLibrary={onRemoveFromLibrary} />}
                  {library.watchlist.length > 0 && <RailSection title="Watchlist" items={library.watchlist.map((i) => ({ ...i, status: "watchlist" as const }))} library={library} onOpen={onOpen} onToggleWatchlist={onToggleWatchlist} onToggleWatched={onToggleWatched} onAddToWatching={onAddToWatching} onAddToWaiting={onAddToWaiting} onRemoveFromLibrary={onRemoveFromLibrary} />}
                  {library.watched.length  > 0 && <RailSection title="Watched"   items={library.watched.map((i) =>   ({ ...i, status: "watched"   as const }))} library={library} onOpen={onOpen} onToggleWatchlist={onToggleWatchlist} onToggleWatched={onToggleWatched} onAddToWatching={onAddToWatching} onAddToWaiting={onAddToWaiting} onRemoveFromLibrary={onRemoveFromLibrary} />}
                </>
              ) : (
                <RailSection title={TABS.find((t) => t.key === tab)?.label || ""} items={sortedItems} library={library} onOpen={onOpen} onToggleWatchlist={onToggleWatchlist} onToggleWatched={onToggleWatched} onAddToWatching={onAddToWatching} onAddToWaiting={onAddToWaiting} onRemoveFromLibrary={onRemoveFromLibrary} />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar accordion */}
        <LibrarySidebar
          allItems={allItems}
          activeTab={tab}
          activeMedia={mediaFilter}
          isAnime={isAnime}
          onSelect={(t, m) => { setTab(t); setMediaFilter(m); }}
        />
      </div>
    </div>
  );
}
