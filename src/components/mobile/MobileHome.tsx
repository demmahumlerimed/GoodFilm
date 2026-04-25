/**
 * GoodFilm — Mobile Home Page
 *
 * App-grade curated home for phone screens. Replaces the desktop hero +
 * horizontal rails layout with a focused, thumb-friendly structure:
 *
 *   1. Featured showcase card (full-width, tall hero card)
 *   2. Category switcher — Movies / TV / All
 *   3. Continue Watching strip (if applicable)
 *   4. Tonight's Pick (from watchlist)
 *   5. Horizontal poster carousel rows
 *
 * Design language: dark cinematic, gold accents, rounded cards, large tap targets.
 */

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, ChevronRight, Play, RefreshCw, Star,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { getTitle, getYear } from "../../utils/library";
import { BACKDROP_BASE, POSTER_BASE } from "../../config";
import type { LibraryItem, MediaItem, MediaType, UserLibrary } from "../../types";

// ── Local re-export of the StreamingRowItem shape (matches App.tsx definition) ─

export type MobileStreamItem = {
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

export type HomeRow = {
  title: string;
  items: MediaItem[];
  mediaType: MediaType;
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileHomeProps {
  featured: MediaItem | null;
  trendingMovies: MediaItem[];
  popularMovies: MediaItem[];
  popularSeries: MediaItem[];
  homeRows: HomeRow[];
  continueWatchingItems: MobileStreamItem[];
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem, mediaType: MediaType) => void;
  onRemoveContinue: (item: MobileStreamItem) => void;
  tonightPickIdx: number;
  setTonightPickIdx: (fn: (n: number) => number) => void;
  homeError: string | null;
}

type CategoryFilter = "all" | "movies" | "tv";

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileHome({
  featured,
  trendingMovies,
  popularMovies,
  popularSeries,
  homeRows,
  continueWatchingItems,
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onRemoveContinue,
  tonightPickIdx,
  setTonightPickIdx,
  homeError,
}: MobileHomeProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");

  // Tonight's Pick
  const watchlistCandidates = library.watchlist.filter(
    (i) => i.posterPath || i.backdropPath
  );
  const tonightPick =
    watchlistCandidates.length > 0
      ? watchlistCandidates[tonightPickIdx % watchlistCandidates.length]
      : null;

  // Featured item — first trending movie or the passed `featured`
  const heroItem = trendingMovies[0] || featured;
  const heroType: MediaType =
    heroItem?.media_type ||
    (heroItem?.first_air_date ? "tv" : "movie");

  // Filter rows by category
  const filteredRows = homeRows.filter((row) => {
    if (category === "all") return true;
    if (category === "movies") return row.mediaType === "movie";
    if (category === "tv") return row.mediaType === "tv";
    return true;
  });

  // Quick source arrays per category
  const categoryItems: MediaItem[] =
    category === "movies"
      ? popularMovies
      : category === "tv"
      ? popularSeries
      : [...trendingMovies];

  return (
    <div className="space-y-0 pb-2">
      {homeError && (
        <div className="mx-4 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
          {homeError}
        </div>
      )}

      {/* ── 1. Featured Hero Card ── */}
      {heroItem && (
        <FeaturedHeroCard
          item={heroItem}
          mediaType={heroType}
          inWatchlist={watchlistKeys.has(`${heroType}-${heroItem.id}`)}
          onOpen={() => onOpen(heroItem, heroType)}
          onToggleWatchlist={() => onToggleWatchlist(heroItem, heroType)}
        />
      )}

      {/* ── 2. Category Switcher ── */}
      <div className="px-4 pt-5 pb-1">
        <CategorySwitcher value={category} onChange={setCategory} />
      </div>

      {/* ── 3. Continue Watching ── */}
      {continueWatchingItems.length > 0 && (
        <MobileSection title="Continue Watching">
          <HorizontalScroll>
            {continueWatchingItems.slice(0, 8).map((ci) => (
              <ContinueCard
                key={ci.id}
                item={ci}
                onOpen={() =>
                  ci.sourceItem
                    ? onOpen(ci.sourceItem, ci.mediaType)
                    : undefined
                }
                onRemove={() => onRemoveContinue(ci)}
              />
            ))}
          </HorizontalScroll>
        </MobileSection>
      )}

      {/* ── 4. Tonight's Pick ── */}
      {tonightPick && (
        <div className="px-4 py-2">
          <TonightPickCard
            item={tonightPick}
            count={watchlistCandidates.length}
            onOpen={() => onOpen(tonightPick, tonightPick.mediaType)}
            onNext={() => setTonightPickIdx((n) => n + 1)}
          />
        </div>
      )}

      {/* ── 5. Trending row (always shown, title-locked) ── */}
      {trendingMovies.length > 0 && (
        <MobileSection title="Trending Now" accent>
          <PosterCarousel
            items={category === "tv" ? popularSeries : trendingMovies}
            mediaType={category === "tv" ? "tv" : "movie"}
            watchlistKeys={watchlistKeys}
            watchedKeys={watchedKeys}
            onOpen={onOpen}
            onToggleWatchlist={onToggleWatchlist}
            onToggleWatched={onToggleWatched}
          />
        </MobileSection>
      )}

      {/* ── 6. Dynamic filtered rows from homeRows ── */}
      {filteredRows.slice(0, 6).map((row) => (
        <MobileSection key={row.title} title={row.title}>
          <PosterCarousel
            items={row.items}
            mediaType={row.mediaType}
            watchlistKeys={watchlistKeys}
            watchedKeys={watchedKeys}
            onOpen={onOpen}
            onToggleWatchlist={onToggleWatchlist}
            onToggleWatched={onToggleWatched}
          />
        </MobileSection>
      ))}

      {/* Spacer for bottom nav */}
      <div className="h-2" />
    </div>
  );
}

// ── Featured Hero Card ─────────────────────────────────────────────────────────

function FeaturedHeroCard({
  item,
  mediaType,
  inWatchlist,
  onOpen,
  onToggleWatchlist,
}: {
  item: MediaItem;
  mediaType: MediaType;
  inWatchlist: boolean;
  onOpen: () => void;
  onToggleWatchlist: () => void;
}) {
  const backdrop = item.backdrop_path || item.poster_path;
  const title = getTitle(item);
  const year = getYear(item);
  const score = item.vote_average?.toFixed(1);

  return (
    <div className="relative mx-0 overflow-hidden" style={{ height: "64vw", minHeight: 280, maxHeight: 420 }}>
      {/* Backdrop */}
      {backdrop ? (
        <motion.img
          initial={{ scale: 1.04, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          src={`${BACKDROP_BASE}${backdrop}`}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#04070b]" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#04070b] via-[#04070b]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#04070b]/60 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
        {/* Type badge */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-[#e8a020] px-2.5 py-[3px] text-[11px] font-black uppercase tracking-[0.12em] text-black">
            {mediaType === "tv" ? "Series" : "Film"}
          </span>
          {score && Number(score) > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/70">
              <Star size={10} className="fill-[#e8a020] text-[#e8a020]" />
              {score}
            </span>
          )}
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-1 line-clamp-2 text-[26px] font-black leading-[1.05] tracking-[-0.03em] text-white"
        >
          {title}
        </motion.h2>

        {/* Meta */}
        <p className="mb-3 text-[11px] text-white/45">
          {year && year !== "—" ? year : ""}
          {year && year !== "—" && item.overview ? "  ·  " : ""}
          <span className="line-clamp-1 inline">{item.overview?.slice(0, 80)}</span>
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onOpen}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#e8a020] px-6 text-[15px] font-black text-black shadow-[0_4px_24px_rgba(232,160,32,0.35)] transition active:opacity-90"
          >
            <Play size={13} fill="currentColor" />
            Watch Now
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleWatchlist}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl border transition",
              inWatchlist
                ? "border-[#e8a020]/60 bg-[#e8a020]/20 text-[#e8a020]"
                : "border-white/20 bg-black/40 text-white/70 backdrop-blur-sm"
            )}
          >
            <Bookmark size={16} className={inWatchlist ? "fill-[#e8a020]" : ""} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onOpen}
            className="flex h-12 items-center gap-1.5 rounded-2xl border border-white/18 bg-black/40 px-4 text-[13px] font-semibold text-white/75 backdrop-blur-sm transition"
          >
            Details
            <ChevronRight size={13} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ── Category Switcher ─────────────────────────────────────────────────────────

function CategorySwitcher({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}) {
  const options: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "For You" },
    { key: "movies", label: "Movies" },
    { key: "tv", label: "TV Shows" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white/[0.06] p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "relative flex-1 rounded-[13px] py-3 text-[14px] font-bold transition-colors",
            value === key
              ? "bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "text-white/40 hover:text-white/65"
          )}
        >
          {value === key && (
            <motion.div
              layoutId="cat-switcher-bg"
              className="absolute inset-0 rounded-[13px] bg-white/[0.12]"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Tonight's Pick Card ────────────────────────────────────────────────────────

function TonightPickCard({
  item,
  count,
  onOpen,
  onNext,
}: {
  item: LibraryItem;
  count: number;
  onOpen: () => void;
  onNext: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0d0f14]">
      {/* Ambient backdrop */}
      {(item.backdropPath || item.posterPath) && (
        <img
          src={`${BACKDROP_BASE}${item.backdropPath || item.posterPath}`}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          style={{ filter: "blur(20px)", transform: "scale(1.15)" }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/90 via-[#07080d]/70 to-transparent" />

      <div className="relative flex items-center gap-4 p-4">
        {/* Poster */}
        <button
          onClick={onOpen}
          className="h-[88px] w-[60px] shrink-0 overflow-hidden rounded-[12px] shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
        >
          {item.posterPath ? (
            <img
              src={`${POSTER_BASE}${item.posterPath}`}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20 text-[10px]">
              No image
            </div>
          )}
        </button>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#e8a020]/70">
            Tonight's Pick
          </p>
          <button
            onClick={onOpen}
            className="block truncate text-[17px] font-black leading-tight tracking-[-0.025em] text-white"
          >
            {item.title}
          </button>
          <p className="mt-1 text-[12px] text-white/40">
            {item.year && item.year !== "—" ? item.year : ""}
            {item.year && item.mediaType ? "  ·  " : ""}
            {item.mediaType === "tv" ? "TV Show" : "Movie"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onOpen}
              className="inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-[#e8a020] px-4 text-[13px] font-black text-black shadow-[0_2px_12px_rgba(232,160,32,0.35)] transition active:scale-95"
            >
              <Play size={11} fill="currentColor" />
              Watch
            </button>
            {count > 1 && (
              <button
                onClick={onNext}
                className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-white/12 bg-white/[0.05] px-3.5 text-[13px] font-semibold text-white/55 transition active:scale-95"
              >
                <RefreshCw size={11} />
                Next
              </button>
            )}
          </div>
        </div>

        {/* Watchlist count */}
        {count > 1 && (
          <div className="shrink-0 flex flex-col items-center pr-1">
            <span className="text-[20px] font-black tabular-nums text-[#e8a020]">{count}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/25">waiting</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section Wrapper ────────────────────────────────────────────────────────────

function MobileSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-5 pb-1">
      {/* Heading */}
      <div className="mb-3 px-4">
        <div className="flex items-center gap-3">
          {accent && (
            <div className="h-px w-4 shrink-0 bg-gradient-to-r from-[#e8a020] to-[#e8a020]/0" />
          )}
          <h3
            className={cn(
              "text-[14px] font-black tracking-[-0.01em]",
              accent ? "text-white" : "text-white/80"
            )}
          >
            {title}
          </h3>
          <div
            className={cn(
              "h-px flex-1 bg-gradient-to-r to-transparent",
              accent ? "from-[#e8a020]/18" : "from-white/[0.055]"
            )}
          />
        </div>
      </div>
      {children}
    </section>
  );
}

// ── Horizontal Scroll Wrapper ─────────────────────────────────────────────────

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-3 overflow-x-auto px-4 pb-2"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ── Continue Watching Card ────────────────────────────────────────────────────

function ContinueCard({
  item,
  onOpen,
  onRemove,
}: {
  item: MobileStreamItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="relative shrink-0 cursor-pointer overflow-hidden rounded-[16px] bg-[#0e0f16]"
      style={{ width: 188, aspectRatio: "16/9" }}
      onClick={onOpen}
    >
      {item.image ? (
        <img
          src={`${BACKDROP_BASE}${item.image}`}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#07080d]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition hover:opacity-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-lg">
          <Play size={14} fill="black" className="text-black" />
        </div>
      </div>

      {/* Progress bar */}
      {item.progress !== undefined && item.progress > 0 && (
        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/15">
          <div
            className="h-full rounded-full bg-[#e8a020]"
            style={{ width: `${Math.min(item.progress, 100)}%` }}
          />
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-2 left-2.5 right-8">
        <p className="truncate text-[13px] font-bold text-white/95">{item.title}</p>
        {item.subtitle && (
          <p className="truncate text-[12px] text-white/50">{item.subtitle}</p>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white/60 transition hover:text-white"
      >
        <span className="text-[10px] font-bold leading-none">✕</span>
      </button>
    </motion.div>
  );
}

// ── Poster Carousel ───────────────────────────────────────────────────────────

function PosterCarousel({
  items,
  mediaType,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
}: {
  items: MediaItem[];
  mediaType: MediaType;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem, mediaType: MediaType) => void;
}) {
  if (!items.length) return null;

  return (
    <div
      className="flex gap-4 overflow-x-auto px-4 pb-3"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {items.slice(0, 15).map((item) => {
        const type: MediaType =
          mediaType || item.media_type || (item.first_air_date ? "tv" : "movie");
        const key = `${type}-${item.id}`;
        const inWatchlist = watchlistKeys.has(key);
        const inWatched = watchedKeys.has(key);
        const title = getTitle(item);
        const year = getYear(item);
        const score = item.vote_average?.toFixed(1);

        return (
          <MobilePosterCard
            key={key}
            item={item}
            mediaType={type}
            title={title}
            year={year}
            score={score}
            inWatchlist={inWatchlist}
            inWatched={inWatched}
            onOpen={() => onOpen(item, type)}
            onToggleWatchlist={() => onToggleWatchlist(item, type)}
            onToggleWatched={() => onToggleWatched(item, type)}
          />
        );
      })}
    </div>
  );
}

// ── Single Mobile Poster Card ─────────────────────────────────────────────────

function MobilePosterCard({
  item,
  mediaType,
  title,
  year,
  score,
  inWatchlist,
  inWatched,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
}: {
  item: MediaItem;
  mediaType: MediaType;
  title: string;
  year: string;
  score?: string;
  inWatchlist: boolean;
  inWatched: boolean;
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
}) {
  return (
    <div className="relative shrink-0" style={{ width: 130 }}>
      {/* Poster */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-[14px] bg-[#0e0f16] shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
        style={{ aspectRatio: "2/3" } as React.CSSProperties}
      >
        {item.poster_path ? (
          <img
            src={`${POSTER_BASE}${item.poster_path}`}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#04070b] text-white/15 text-[11px] text-center px-2">
            {title}
          </div>
        )}

        {/* Subtle overlay on hover/focus */}
        <div className="absolute inset-0 bg-black/0 transition hover:bg-black/20" />

        {/* Status indicators */}
        {inWatched && (
          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/90 shadow">
            <span className="text-[11px] font-bold text-white">✓</span>
          </div>
        )}
        {inWatchlist && !inWatched && (
          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#e8a020]/90 shadow">
            <Bookmark size={9} fill="black" className="text-black" />
          </div>
        )}

        {/* Score badge */}
        {score && Number(score) >= 7 && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-[3px] backdrop-blur-sm">
            <Star size={7} className="fill-[#e8a020] text-[#e8a020]" />
            <span className="text-[11px] font-bold text-white/90">{score}</span>
          </div>
        )}
      </motion.button>

      {/* Title + action row */}
      <div className="mt-2 flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-white/90">{title}</p>
          <p className="mt-0.5 text-[12px] text-white/35">{year}</p>
        </div>
        {/* Quick bookmark */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={onToggleWatchlist}
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
            inWatchlist
              ? "bg-[#e8a020]/20 text-[#e8a020]"
              : "bg-white/[0.07] text-white/35 hover:text-white/65"
          )}
        >
          <Bookmark size={11} className={inWatchlist ? "fill-[#e8a020]" : ""} />
        </motion.button>
      </div>
    </div>
  );
}
