import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, ChevronLeft, ChevronRight, Eye, Film, Play, Star, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { BACKDROP_BASE, POSTER_BASE } from "../../config";
import { fetchTMDBLogoPath } from "../../services/tmdb";
import { getTitle, getYear, keyFor } from "../../utils/library";
import type { LibraryItem, MediaItem, MediaType } from "../../types";

export function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="h-5 w-[3px] rounded-full bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
      <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">{title}</h2>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
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

export function SegmentTabs({
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

export function InlineRatingControl({ value, onChange }: { value?: number; onChange: (rating: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const committedValue = typeof value === "number" ? value : 0;
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
      if (event.key === "Escape") { setOpen(false); setHoverValue(null); }
      else if (event.key === "ArrowRight") { event.preventDefault(); onChange(Math.min(10, committedValue + 1)); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); onChange(Math.max(0, committedValue - 1)); }
      else if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); onChange(0); setHoverValue(null); }
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
          const targetHalf = (star - 0.5) * 2;
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
          onClick={() => { onChange(0); setHoverValue(null); }}
          className="ml-1 rounded-full border border-white/10 px-2 py-1 text-[10px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function PosterCard({
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
      ? "w-[240px] min-w-[240px] md:w-[280px] md:min-w-[280px] lg:w-[320px] lg:min-w-[320px]"
      : size === "grid"
        ? "w-full min-w-0"
        : "w-[160px] min-w-[160px] sm:w-[190px] sm:min-w-[190px] lg:w-[220px] lg:min-w-[220px]";

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative cursor-pointer snap-start", sizeClasses)}
    >
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 -z-10 rounded-[22px] blur-xl"
        style={{ background: glowColor }}
      />
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[14px] bg-[#0d0f14] shadow-[0_8px_28px_rgba(0,0,0,0.5)]">
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
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_35%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.92)_100%)]" />
          <motion.div
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset"
            style={{ boxShadow: `inset 0 0 0 1px ${glowColor}` }}
          />
          {rating && Number(rating) > 0 && (
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-sm bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
              <Star size={9} className="fill-[#efb43f] text-[#efb43f]" />
              <span className="text-[10px] font-bold text-white">{Number(rating).toFixed(1)}</span>
            </div>
          )}
          <div className="absolute right-2.5 top-2.5 flex flex-col gap-1 opacity-100 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
              className={cn(
                "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
                inWatchlist ? "bg-[#efb43f] shadow-[0_2px_10px_rgba(239,180,63,0.5)]" : "bg-black/60 hover:bg-[#efb43f]"
              )}
            >
              <Bookmark size={11} className={inWatchlist ? "fill-black text-black" : "text-white"} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
              className={cn(
                "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
                inWatched ? "bg-white shadow-[0_2px_10px_rgba(255,255,255,0.3)]" : "bg-black/60 hover:bg-white"
              )}
            >
              <Eye size={11} className={inWatched ? "fill-black text-black" : "text-white"} />
            </motion.button>
          </div>
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

export function Rail({
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
    <section className="mb-8 md:mb-12">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">{title}</h3>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/8 bg-[#07080d]/95 p-2 text-white/40 shadow-xl backdrop-blur-sm transition hover:border-[#efb43f]/40 hover:text-[#efb43f] md:flex"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/8 bg-[#07080d]/95 p-2 text-white/40 shadow-xl backdrop-blur-sm transition hover:border-[#efb43f]/40 hover:text-[#efb43f] md:flex"
        >
          <ChevronRight size={14} />
        </button>
        <div
          ref={ref}
          className={cn(
            "flex overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory md:snap-none touch-pan-x",
            largeCards ? "gap-3 md:gap-4" : "gap-2.5 md:gap-3"
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

export function Grid({
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

export type StreamingRowItem = {
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

export function StreamingMediaCard({ item, onOpen }: { item: StreamingRowItem; onOpen: (item: StreamingRowItem) => void }) {
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
      className="relative w-[200px] min-w-[200px] md:w-[280px] md:min-w-[280px] lg:w-[340px] lg:min-w-[340px] snap-start"
    >
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

export function ContinueWatchingCard({ item, onOpen, onRemove }: { item: StreamingRowItem; onOpen: (item: StreamingRowItem) => void; onRemove: (item: StreamingRowItem) => void }) {
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
      className="relative w-[200px] min-w-[200px] md:w-[280px] md:min-w-[280px] lg:w-[340px] lg:min-w-[340px] snap-start"
    >
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

export function ContentRow({
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
    <section className="mb-10 md:mb-14">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">{title}</h3>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/10 bg-[#0f1117]/90 p-2.5 text-white/60 shadow-lg backdrop-blur-sm transition hover:border-[#efb43f]/30 hover:text-[#efb43f] md:flex"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/10 bg-[#0f1117]/90 p-2.5 text-white/60 shadow-lg backdrop-blur-sm transition hover:border-[#efb43f]/30 hover:text-[#efb43f] md:flex"
        >
          <ChevronRight size={16} />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory md:snap-none md:gap-5">
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
