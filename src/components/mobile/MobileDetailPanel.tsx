/**
 * GoodFilm — Mobile Detail Panel
 *
 * Immersive full-screen detail screen for phone-sized viewports.
 * Replaces the desktop DetailModal layout when IS_MOBILE is true.
 *
 * Layout:
 *   • Hero backdrop (58 vw, capped 380 px) with overlay title
 *   • Back + action buttons in hero chrome
 *   • Scrollable content: scores → genres → CTA → synopsis → cast
 *   • TV: season selector + episode preview strip
 *   • Similar titles carousel
 *
 * Design language: dark cinematic, gold accents, rounded sections, large tap targets.
 */

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Film,
  Globe,
  Play,
  Star,
  Tv,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { BACKDROP_BASE, POSTER_BASE } from "../../config";
import type {
  CastMember,
  Episode,
  Genre,
  MediaItem,
  MediaType,
  SeasonInfo,
} from "../../types";

// ── Local alias for watch-provider shape (defined in App.tsx) ─────────────────

type WatchProviderItem = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileDetailPanelProps {
  open: boolean;

  // Core display
  title: string;
  backdropPath: string | null;
  posterPath: string | null;
  mediaType: MediaType;
  yearDisplay: string;
  genreList: Genre[];
  genreText: string;

  // Scores
  displayScore: number;
  imdbScoreValue: number | null;
  imdbVotes: number | null;
  rtRating: string | null;
  metacriticScore: string | null;

  // Details
  runtimeText: string | null;
  releaseDate: string;
  languageText: string;
  directorText: string;
  studioText: string;
  overview: string;
  omdbAwards: string | null;
  trailerKey: string | null;

  // Cast & similar
  castForDisplay: CastMember[];
  similarItems: MediaItem[];

  // TV-specific
  episodes: Episode[];
  selectedSeason: number;
  seasonsMeta: SeasonInfo[];
  watchedEpisodes: number[];
  currentEpisodeNumber: number;

  // Watch providers
  watchProviders: {
    flatrate?: WatchProviderItem[];
    rent?: WatchProviderItem[];
    free?: WatchProviderItem[];
  } | null;

  // Library state
  inWatchlist: boolean;
  inWatched: boolean;
  userRating?: number;
  canWatch: boolean;

  // Similarity state
  similarWatchlistKeys: Set<string>;
  similarWatchedKeys: Set<string>;

  // Actions
  onClose: () => void;
  onWatchNow: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onRate: (r: number) => void;
  onSeasonChange: (s: number) => void;
  onOpenRelated: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatched: (item: MediaItem, mediaType: MediaType) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileDetailPanel({
  open,
  title,
  backdropPath,
  posterPath,
  mediaType,
  yearDisplay,
  genreList,
  genreText,
  displayScore,
  imdbScoreValue,
  imdbVotes,
  rtRating,
  metacriticScore,
  runtimeText,
  releaseDate,
  languageText,
  directorText,
  studioText,
  overview,
  omdbAwards,
  trailerKey,
  castForDisplay,
  similarItems,
  episodes,
  selectedSeason,
  seasonsMeta,
  watchedEpisodes,
  currentEpisodeNumber,
  watchProviders,
  inWatchlist,
  inWatched,
  canWatch,
  userRating,
  similarWatchlistKeys,
  similarWatchedKeys,
  onClose,
  onWatchNow,
  onToggleWatchlist,
  onToggleWatched,
  onRate,
  onSeasonChange,
  onOpenRelated,
  onToggleSimilarWatchlist,
  onToggleSimilarWatched,
}: MobileDetailPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRatingPicker, setShowRatingPicker] = useState(false);

  const scoreLabel = imdbScoreValue ? "IMDb" : "TMDB";
  const score = displayScore.toFixed(1);
  const visibleGenres = genreList.length ? genreList : genreText ? [{ id: 0, name: genreText }] : [];
  const allProviders = [
    ...(watchProviders?.flatrate || []),
    ...(watchProviders?.free || []),
    ...(watchProviders?.rent || []),
  ].slice(0, 6);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-detail"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 38 }}
          className="fixed inset-0 z-[70] flex flex-col bg-[#07080d] will-change-transform"
          style={{ touchAction: "pan-y" }}
        >
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <Hero
            backdropPath={backdropPath}
            posterPath={posterPath}
            title={title}
            mediaType={mediaType}
            yearDisplay={yearDisplay}
            score={score}
            scoreLabel={scoreLabel}
            inWatchlist={inWatchlist}
            inWatched={inWatched}
            onClose={onClose}
            onToggleWatchlist={onToggleWatchlist}
            onToggleWatched={onToggleWatched}
          />

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {/* Genre chips row */}
            {visibleGenres.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1 [scrollbar-width:none]">
                {visibleGenres.map((g) => (
                  <span
                    key={g.id}
                    className="shrink-0 rounded-full border border-[#e8a020]/25 bg-[#e8a020]/10 px-3 py-1 text-[10px] font-semibold text-[#e8a020]"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Score badges row */}
            <div className="flex items-center gap-2.5 px-4 pt-3 pb-1 flex-wrap">
              {/* Main score */}
              <div className="flex items-center gap-1.5 rounded-[10px] border border-[#e8a020]/20 bg-[#e8a020]/10 px-3 py-1.5">
                <Star size={11} className="fill-[#e8a020] text-[#e8a020]" />
                <span className="text-[13px] font-black text-[#e8a020]">{score}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#e8a020]/55">{scoreLabel}</span>
              </div>
              {imdbVotes && (
                <span className="text-[10px] text-white/25">
                  {(imdbVotes / 1000).toFixed(0)}k votes
                </span>
              )}
              {rtRating && (
                <div className="flex items-center gap-1 rounded-[10px] border border-orange-500/20 bg-orange-500/10 px-3 py-1.5">
                  <span className="text-[13px]">🍅</span>
                  <span className="text-[12px] font-bold text-orange-400">{rtRating}</span>
                </div>
              )}
              {metacriticScore && (
                <div className="flex items-center gap-1 rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                  <span className="text-[10px] font-bold text-emerald-400/60">MC</span>
                  <span className="text-[12px] font-bold text-emerald-400">{metacriticScore}</span>
                </div>
              )}
              {/* Your rating */}
              <button
                onClick={() => setShowRatingPicker((p) => !p)}
                className={cn(
                  "flex items-center gap-1 rounded-[10px] border px-3 py-1.5 transition active:scale-95",
                  typeof userRating === "number"
                    ? "border-white/15 bg-white/[0.06] text-white/80"
                    : "border-white/8 bg-white/[0.03] text-white/35"
                )}
              >
                <Star
                  size={11}
                  className={typeof userRating === "number" ? "fill-white text-white" : "text-white/35"}
                />
                <span className="text-[11px] font-semibold">
                  {typeof userRating === "number" ? `${(userRating / 2).toFixed(1)}` : "Rate"}
                </span>
              </button>
            </div>

            {/* Inline rating picker */}
            <AnimatePresence>
              {showRatingPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 px-4 py-3">
                    {[2, 4, 6, 8, 10].map((v) => (
                      <motion.button
                        key={v}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => { onRate(v); setShowRatingPicker(false); }}
                        className={cn(
                          "flex h-10 w-10 flex-col items-center justify-center rounded-xl border text-[11px] font-black transition",
                          userRating === v
                            ? "border-[#e8a020]/50 bg-[#e8a020]/20 text-[#e8a020]"
                            : "border-white/10 bg-white/[0.04] text-white/55"
                        )}
                      >
                        <Star size={10} className={userRating && userRating >= v ? "fill-[#e8a020] text-[#e8a020]" : "text-white/20"} />
                        {v / 2}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Watch Now CTA ── */}
            <div className="px-4 py-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={canWatch ? onWatchNow : undefined}
                disabled={!canWatch}
                className={cn(
                  "flex w-full h-[52px] items-center justify-center gap-3 rounded-[16px] text-[15px] font-black tracking-[0.01em] transition",
                  canWatch
                    ? "bg-[#e8a020] text-black shadow-[0_6px_32px_rgba(232,160,32,0.35)] active:opacity-90"
                    : "bg-white/[0.06] text-white/25 cursor-not-allowed"
                )}
              >
                <Play size={17} fill="currentColor" />
                {mediaType === "tv" ? "Watch Series" : "Watch Film"}
              </motion.button>

              {/* Secondary actions row */}
              <div className="mt-2.5 flex items-center gap-2">
                {trailerKey && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailerKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 h-10 items-center justify-center gap-1.5 rounded-[12px] border border-white/10 bg-white/[0.05] text-[12px] font-semibold text-white/65 transition active:bg-white/10"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#ff0000]">
                      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z" />
                    </svg>
                    Trailer
                  </a>
                )}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={onToggleWatchlist}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-[12px] border px-4 text-[12px] font-semibold transition",
                    inWatchlist
                      ? "border-[#e8a020]/40 bg-[#e8a020]/15 text-[#e8a020]"
                      : "border-white/10 bg-white/[0.05] text-white/50"
                  )}
                >
                  <Bookmark size={13} className={inWatchlist ? "fill-[#e8a020]" : ""} />
                  {inWatchlist ? "Saved" : "Save"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={onToggleWatched}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[12px] border transition",
                    inWatched
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                      : "border-white/10 bg-white/[0.05] text-white/40"
                  )}
                >
                  <Eye size={14} />
                </motion.button>
              </div>
            </div>

            {/* ── Quick facts ── */}
            <div className="mx-4 mb-4 flex flex-wrap gap-x-4 gap-y-1.5 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3">
              {runtimeText && runtimeText !== "—" && (
                <FactPill icon={<Clock size={10} />} label={runtimeText} />
              )}
              {yearDisplay && yearDisplay !== "—" && (
                <FactPill icon={<Film size={10} />} label={yearDisplay} />
              )}
              {languageText && languageText !== "—" && (
                <FactPill icon={<Globe size={10} />} label={languageText} />
              )}
              {directorText && directorText !== "Unknown" && (
                <FactPill icon={<Tv size={10} />} label={directorText} />
              )}
            </div>

            {/* ── Synopsis ── */}
            {overview && (
              <ContentSection title="Synopsis">
                <SynopsisBlock text={overview} />
              </ContentSection>
            )}

            {/* ── Awards banner ── */}
            {omdbAwards && (
              <div className="mx-4 mb-4 flex items-start gap-3 rounded-[14px] border border-[#e8a020]/15 bg-[#e8a020]/5 px-4 py-3">
                <span className="mt-0.5 text-[18px]">🏆</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#e8a020]/60">
                    Awards
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#e8a020]/85">{omdbAwards}</p>
                </div>
              </div>
            )}

            {/* ── Cast strip ── */}
            {castForDisplay.length > 0 && (
              <ContentSection title="Cast">
                <div
                  className="flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"
                  style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                >
                  {castForDisplay.map((person) => (
                    <CastCard key={person.id} person={person} />
                  ))}
                </div>
              </ContentSection>
            )}

            {/* ── TV: Season + Episodes ── */}
            {mediaType === "tv" && (
              <TvEpisodesSection
                episodes={episodes}
                selectedSeason={selectedSeason}
                seasonsMeta={seasonsMeta}
                watchedEpisodes={watchedEpisodes}
                currentEpisodeNumber={currentEpisodeNumber}
                onSeasonChange={onSeasonChange}
                onWatchNow={onWatchNow}
              />
            )}

            {/* ── Watch providers ── */}
            {allProviders.length > 0 && (
              <ContentSection title="Available On">
                <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                  {allProviders.map((p, i) => (
                    <img
                      key={`${p.provider_id}-${i}`}
                      src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                      alt={p.provider_name}
                      title={p.provider_name}
                      className="h-11 w-11 shrink-0 rounded-[10px] ring-1 ring-white/10"
                    />
                  ))}
                </div>
              </ContentSection>
            )}

            {/* ── Similar titles ── */}
            {similarItems.length > 0 && (
              <ContentSection title="You Might Like">
                <div
                  className="flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"
                  style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                >
                  {similarItems.slice(0, 12).map((item) => {
                    const type: MediaType =
                      item.media_type || (item.first_air_date ? "tv" : mediaType);
                    const key = `${type}-${item.id}`;
                    const inWl = similarWatchlistKeys.has(key);
                    return (
                      <SimilarCard
                        key={key}
                        item={item}
                        inWatchlist={inWl}
                        onOpen={() => onOpenRelated(item, type)}
                        onToggleWatchlist={() => onToggleSimilarWatchlist(item, type)}
                      />
                    );
                  })}
                </div>
              </ContentSection>
            )}

            {/* Bottom spacer — room for sticky CTA bar */}
            <div className="h-28" />
          </div>

          {/* ── Sticky bottom action bar ─────────────────────────────────── */}
          <div className="shrink-0 border-t border-white/[0.07] bg-[#07080d]/95 backdrop-blur-xl pb-safe">
            <div className="flex items-center gap-2.5 px-4 py-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={canWatch ? onWatchNow : undefined}
                disabled={!canWatch}
                className={cn(
                  "flex flex-1 h-12 items-center justify-center gap-2.5 rounded-[14px] text-[14px] font-black tracking-[0.01em] transition",
                  canWatch
                    ? "bg-[#e8a020] text-black shadow-[0_4px_20px_rgba(232,160,32,0.3)] active:opacity-90"
                    : "bg-white/[0.06] text-white/25 cursor-not-allowed"
                )}
              >
                <Play size={16} fill="currentColor" />
                {mediaType === "tv" ? "Watch Series" : "Watch Film"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onToggleWatchlist}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[14px] border transition",
                  inWatchlist
                    ? "border-[#e8a020]/40 bg-[#e8a020]/15 text-[#e8a020]"
                    : "border-white/12 bg-white/[0.05] text-white/50"
                )}
              >
                <Bookmark size={16} className={inWatchlist ? "fill-[#e8a020]" : ""} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onToggleWatched}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[14px] border transition",
                  inWatched
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    : "border-white/12 bg-white/[0.05] text-white/40"
                )}
              >
                <Eye size={16} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({
  backdropPath,
  posterPath,
  title,
  mediaType,
  yearDisplay,
  score,
  scoreLabel,
  inWatchlist,
  inWatched,
  onClose,
  onToggleWatchlist,
  onToggleWatched,
}: {
  backdropPath: string | null;
  posterPath: string | null;
  title: string;
  mediaType: MediaType;
  yearDisplay: string;
  score: string;
  scoreLabel: string;
  inWatchlist: boolean;
  inWatched: boolean;
  onClose: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
}) {
  const imgSrc = backdropPath
    ? `${BACKDROP_BASE}${backdropPath}`
    : posterPath
    ? `${POSTER_BASE}${posterPath}`
    : null;

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ height: "65vw", minHeight: 260, maxHeight: 420 }}
    >
      {/* Backdrop */}
      {imgSrc ? (
        <motion.img
          key={imgSrc}
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          src={imgSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#04070b]" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/50 to-transparent" />

      {/* ── Chrome: back + actions ── */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
        {/* Back */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/90 backdrop-blur-xl"
        >
          <ChevronLeft size={20} />
        </motion.button>

        {/* Action cluster */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleWatched}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition",
              inWatched
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                : "border-white/12 bg-black/40 text-white/55"
            )}
            aria-label={inWatched ? "Unmark watched" : "Mark watched"}
          >
            <Eye size={15} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleWatchlist}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition",
              inWatchlist
                ? "border-[#e8a020]/40 bg-[#e8a020]/20 text-[#e8a020]"
                : "border-white/12 bg-black/40 text-white/55"
            )}
            aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark size={14} className={inWatchlist ? "fill-[#e8a020]" : ""} />
          </motion.button>
        </div>
      </div>

      {/* ── Title block (bottom of hero) ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        {/* Type + score badges */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-[#e8a020] px-2.5 py-[3px] text-[9px] font-black uppercase tracking-[0.12em] text-black">
            {mediaType === "tv" ? "Series" : "Film"}
          </span>
          {yearDisplay && yearDisplay !== "—" && (
            <span className="text-[11px] text-white/45">{yearDisplay}</span>
          )}
          <span className="flex items-center gap-1 text-[11px] font-semibold text-white/55">
            <Star size={9} className="fill-[#e8a020] text-[#e8a020]" />
            {score}
            <span className="text-white/30">{scoreLabel}</span>
          </span>
        </div>
        {/* Title */}
        <h1 className="line-clamp-2 text-[24px] font-black leading-[1.08] tracking-[-0.03em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          {title}
        </h1>
      </div>
    </div>
  );
}

// ── TV Episodes Section ───────────────────────────────────────────────────────

function TvEpisodesSection({
  episodes,
  selectedSeason,
  seasonsMeta,
  watchedEpisodes,
  currentEpisodeNumber,
  onSeasonChange,
  onWatchNow,
}: {
  episodes: Episode[];
  selectedSeason: number;
  seasonsMeta: SeasonInfo[];
  watchedEpisodes: number[];
  currentEpisodeNumber: number;
  onSeasonChange: (s: number) => void;
  onWatchNow: () => void;
}) {
  const watchedSet = new Set(watchedEpisodes);
  const progressPct = episodes.length
    ? Math.round((watchedEpisodes.length / episodes.length) * 100)
    : 0;
  const nextEp = episodes.find((ep) => !watchedSet.has(ep.episode_number));

  const seasons = seasonsMeta.filter((s) => s.season_number > 0);

  return (
    <ContentSection title="Episodes">
      {/* Season chips */}
      {seasons.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {seasons.map((s) => (
            <button
              key={s.season_number}
              onClick={() => onSeasonChange(s.season_number)}
              className={cn(
                "shrink-0 h-11 flex items-center rounded-full px-4 text-[13px] font-bold transition",
                selectedSeason === s.season_number
                  ? "bg-[#e8a020] text-black shadow-[0_2px_10px_rgba(232,160,32,0.3)]"
                  : "border border-white/10 bg-white/[0.04] text-white/55 active:bg-white/[0.08]"
              )}
            >
              S{s.season_number}
            </button>
          ))}
        </div>
      )}

      {/* Progress summary */}
      {episodes.length > 0 && (
        <div className="mx-4 mb-3 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white/55">
              Season {selectedSeason} · {watchedEpisodes.length}/{episodes.length} watched
            </span>
            <span className="text-[11px] font-bold text-[#e8a020]">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#e8a020] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Continue / Watch Now CTA for TV */}
      <div className="px-4 mb-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onWatchNow}
          className="flex w-full h-11 items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/[0.05] text-[13px] font-bold text-white/80 transition active:bg-white/10"
        >
          <ChevronRight size={15} />
          {nextEp ? `Continue · E${nextEp.episode_number} "${nextEp.name}"` : "Pick Episode"}
        </motion.button>
      </div>

      {/* Episode list — vertical rows */}
      {episodes.length > 0 && (
        <div className="divide-y divide-white/[0.05]">
          {episodes.map((ep) => {
            const watched = watchedSet.has(ep.episode_number);
            const isCurrent = ep.episode_number === currentEpisodeNumber;
            return (
              <EpisodeRow
                key={ep.id}
                ep={ep}
                watched={watched}
                isCurrent={isCurrent}
                onPick={onWatchNow}
              />
            );
          })}
        </div>
      )}
    </ContentSection>
  );
}

// ── Episode Row ───────────────────────────────────────────────────────────────

function EpisodeRow({
  ep,
  watched,
  isCurrent,
  onPick,
}: {
  ep: Episode;
  watched: boolean;
  isCurrent: boolean;
  onPick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onPick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/[0.03]"
    >
      {/* Thumbnail */}
      <div
        className="relative shrink-0 overflow-hidden rounded-[8px] bg-white/[0.06]"
        style={{ width: 80, height: 45 }}
      >
        {ep.still_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${ep.still_path}`}
            alt={ep.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tv size={16} className="text-white/20" />
          </div>
        )}
        {watched && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <span className="text-[11px] font-black text-white">✓</span>
            </div>
          </div>
        )}
        {isCurrent && !watched && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play size={14} className="fill-white text-white drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-[11px] font-bold uppercase tracking-[0.06em]",
          isCurrent ? "text-[#e8a020]" : "text-white/40"
        )}>
          E{ep.episode_number}
        </p>
        <p className={cn(
          "truncate text-[13px] font-semibold leading-snug",
          isCurrent ? "text-white" : "text-white/70"
        )}>
          {ep.name}
        </p>
        {ep.runtime ? (
          <p className="mt-0.5 text-[11px] text-white/40">{ep.runtime}m</p>
        ) : null}
      </div>

      {isCurrent && (
        <Play size={12} className="shrink-0 fill-[#e8a020] text-[#e8a020] mr-0.5" />
      )}
    </motion.button>
  );
}

// ── Cast Card ─────────────────────────────────────────────────────────────────

function CastCard({ person }: { person: CastMember }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5" style={{ width: 70 }}>
      <div className="h-[70px] w-[70px] overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
        {person.profile_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
            alt={person.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20 text-[10px] text-center px-1">
            {person.name.slice(0, 2)}
          </div>
        )}
      </div>
      <p className="w-full truncate text-center text-[9px] font-semibold leading-tight text-white/65">
        {person.name}
      </p>
      {person.character && (
        <p className="w-full truncate text-center text-[8px] text-white/30 -mt-1">
          {person.character}
        </p>
      )}
    </div>
  );
}

// ── Similar Card ──────────────────────────────────────────────────────────────

function SimilarCard({
  item,
  inWatchlist,
  onOpen,
  onToggleWatchlist,
}: {
  item: MediaItem;
  inWatchlist: boolean;
  onOpen: () => void;
  onToggleWatchlist: () => void;
}) {
  const title = item.title || item.name || "Untitled";
  return (
    <div className="relative shrink-0" style={{ width: 100 }}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-[11px] bg-white/[0.04]"
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
          <div className="flex h-full w-full items-center justify-center text-white/10 text-[9px] text-center px-2">
            {title}
          </div>
        )}
        {/* Bookmark overlay */}
        {inWatchlist && (
          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#e8a020]/90">
            <Bookmark size={9} fill="black" className="text-black" />
          </div>
        )}
      </motion.button>
      <p className="mt-1 truncate text-[10px] font-semibold text-white/70">{title}</p>
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={onToggleWatchlist}
        className="mt-0.5 text-[8px] text-white/25 transition hover:text-[#e8a020]"
      >
        {inWatchlist ? "Saved" : "+ Save"}
      </motion.button>
    </div>
  );
}

// ── Synopsis Block ────────────────────────────────────────────────────────────

function SynopsisBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;
  const displayed = expanded || !isLong ? text : text.slice(0, 200) + "…";

  return (
    <div className="px-4">
      <p className="text-[13px] leading-[1.7] text-white/60">{displayed}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-[11px] font-semibold text-[#e8a020]/70 transition hover:text-[#e8a020]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

// ── Shared section wrapper ─────────────────────────────────────────────────────

function ContentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-5 pb-1">
      <div className="mb-3 flex items-center gap-2 px-4">
        <div className="h-3.5 w-[2.5px] rounded-full bg-gradient-to-b from-[#e8a020] to-[#c97a0a]" />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/70">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

// ── Fact pill ─────────────────────────────────────────────────────────────────

function FactPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-white/45">
      <span className="text-white/25">{icon}</span>
      {label}
    </div>
  );
}
