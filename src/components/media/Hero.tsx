import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, Info, Play, Star } from "lucide-react";
import { BACKDROP_BASE } from "../../config";
import { tmdbFetch } from "../../services/tmdb";
import { omdbFetch } from "../../services/omdb";
import { getTitle, getYear } from "../../utils/library";
import type { MediaItem, MediaType, VideoResult } from "../../types";

const HERO_GENRE_THEMES: Record<number, { bg1: string; bg2: string; accent: string; btnBg: string; btnShadow: string }> = {
  28:   { bg1:"#2a0a00", bg2:"#160400", accent:"#ff6030", btnBg:"#d45020", btnShadow:"rgba(212,80,32,0.55)"  },
  12:   { bg1:"#001a0a", bg2:"#000d05", accent:"#00d964", btnBg:"#00b050", btnShadow:"rgba(0,176,80,0.55)"   },
  16:   { bg1:"#001c1c", bg2:"#000e0e", accent:"#00e5e5", btnBg:"#00acc1", btnShadow:"rgba(0,172,193,0.55)"  },
  35:   { bg1:"#201400", bg2:"#120a00", accent:"#ffd600", btnBg:"#f9a825", btnShadow:"rgba(249,168,37,0.55)" },
  80:   { bg1:"#280000", bg2:"#140000", accent:"#ff1a1a", btnBg:"#b71c1c", btnShadow:"rgba(183,28,28,0.55)"  },
  18:   { bg1:"#080818", bg2:"#04040e", accent:"#7c83e0", btnBg:"#5c6bc0", btnShadow:"rgba(92,107,192,0.55)" },
  14:   { bg1:"#001020", bg2:"#000810", accent:"#40a0ff", btnBg:"#1565c0", btnShadow:"rgba(21,101,192,0.55)" },
  27:   { bg1:"#130018", bg2:"#08000e", accent:"#b040e0", btnBg:"#7b1fa2", btnShadow:"rgba(123,31,162,0.55)" },
  9648: { bg1:"#00101a", bg2:"#000810", accent:"#00aaff", btnBg:"#0277bd", btnShadow:"rgba(2,119,189,0.55)"  },
  10749:{ bg1:"#220010", bg2:"#120008", accent:"#f06292", btnBg:"#c2185b", btnShadow:"rgba(194,24,91,0.55)"  },
  878:  { bg1:"#000820", bg2:"#000410", accent:"#40c4ff", btnBg:"#0288d1", btnShadow:"rgba(2,136,209,0.55)"  },
  53:   { bg1:"#200c00", bg2:"#100600", accent:"#ff9800", btnBg:"#e65100", btnShadow:"rgba(230,81,0,0.55)"   },
};
const HERO_DEFAULT_THEME = { bg1:"#1a0000", bg2:"#0a0000", accent:"#00e676", btnBg:"#00c853", btnShadow:"rgba(0,200,83,0.55)" };

const GENRES: Record<number, string> = {
  28:"Action", 12:"Adventure", 16:"Animation", 35:"Comedy", 80:"Crime",
  99:"Documentary", 18:"Drama", 10751:"Family", 14:"Fantasy", 36:"History",
  27:"Horror", 10402:"Music", 9648:"Mystery", 10749:"Romance", 878:"Sci-Fi",
  53:"Thriller", 10752:"War", 37:"Western", 10759:"Action & Adventure",
  10765:"Sci-Fi & Fantasy",
};

export function Hero({
  items,
  fallbackItem,
  onOpen,
  onToggleWatchlist,
}: {
  items: MediaItem[];
  fallbackItem?: MediaItem | null;
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
}) {
  const sourceItems = items.length ? items : fallbackItem ? [fallbackItem] : [];
  const [heroIndex, setHeroIndex]   = useState(0);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [omdbData, setOmdbData]     = useState<{ imdb: string | null; metacritic: string | null }>({ imdb: null, metacritic: null });

  useEffect(() => {
    if (document.getElementById("hero-display-font")) return;
    const link = document.createElement("link");
    link.id   = "hero-display-font";
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Creepster&family=Bebas+Neue&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => { setHeroIndex(0); }, [sourceItems.length, sourceItems[0]?.id]);

  useEffect(() => {
    if (sourceItems.length <= 1) return;
    const t = window.setInterval(() => setHeroIndex(p => (p + 1) % sourceItems.length), 9000);
    return () => window.clearInterval(t);
  }, [sourceItems.length]);

  useEffect(() => {
    const cur = sourceItems[heroIndex];
    if (!cur) return;
    setTrailerKey(null);
    const mt: MediaType = cur.media_type || (cur.first_air_date ? "tv" : "movie");
    tmdbFetch<{ results: VideoResult[] }>(`/${mt}/${cur.id}/videos`)
      .then(res => {
        const vids = res.results || [];
        const t = vids.find(v => v.site === "YouTube" && v.type === "Trailer")
               || vids.find(v => v.site === "YouTube" && v.type === "Teaser")
               || vids.find(v => v.site === "YouTube");
        setTrailerKey(t?.key || null);
      }).catch(() => {});
  }, [heroIndex, sourceItems.length]);

  useEffect(() => {
    const cur = sourceItems[heroIndex];
    if (!cur) { setOmdbData({ imdb: null, metacritic: null }); return; }
    setOmdbData({ imdb: null, metacritic: null });
    const t = getTitle(cur);
    const y = getYear(cur);
    omdbFetch({ t, ...(y && y !== "—" ? { y } : {}) })
      .then(d => {
        if (d) setOmdbData({
          imdb:       d.imdbRating && d.imdbRating !== "N/A" ? d.imdbRating : null,
          metacritic: d.Metascore  && d.Metascore  !== "N/A" ? d.Metascore  : null,
        });
      }).catch(() => {});
  }, [heroIndex, sourceItems.length]);

  const item = sourceItems[heroIndex] || fallbackItem || null;
  if (!item) return <div className="h-[600px] bg-black" />;

  const mediaType: MediaType   = item.media_type || (item.first_air_date ? "tv" : "movie");
  const backdrop  = item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : "";
  const charImg   = item.poster_path
    ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
    : backdrop;

  const genres    = (item.genre_ids || []).slice(0, 4).map(id => GENRES[id]).filter(Boolean);
  const year      = getYear(item);
  const isTv      = mediaType === "tv";
  const subtitle  = isTv ? "Season 1" : year ? `${year}` : "";
  const rating    = item.vote_average || 0;
  const starCount = Math.round(rating / 2);
  const imdbLabel = omdbData.imdb || (rating > 0 ? rating.toFixed(1) : null);

  const primaryGid = (item.genre_ids || [])[0];
  const theme = HERO_GENRE_THEMES[primaryGid] ?? HERO_DEFAULT_THEME;

  const n       = sourceItems.length;
  const VISIBLE = Math.min(5, n);
  const half    = Math.floor(VISIBLE / 2);
  const carouselIndices = Array.from({ length: VISIBLE }, (_, i) => (heroIndex - half + i + n) % n);

  return (
    <section
      className="relative isolate w-full overflow-hidden"
      style={{
        height: "clamp(560px, 84svh, 940px)",
        background: `radial-gradient(ellipse 90% 75% at 62% 38%, ${theme.bg1} 0%, ${theme.bg2} 48%, #000 100%)`,
        transition: "background 0.9s ease",
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={`bgtint-${heroIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.22 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1 }}
          className="pointer-events-none absolute inset-0 z-[0]"
          style={{ filter: "blur(72px) saturate(1.6)" }}
        >
          {backdrop && <img src={backdrop} alt="" className="h-full w-full object-cover" />}
        </motion.div>
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.032] mix-blend-screen"
        style={{
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)'/%3E%3C/svg%3E")`,
          backgroundRepeat:"repeat", backgroundSize:"160px 160px",
        }}
      />

      <AnimatePresence mode="sync">
        <motion.div
          key={`char-${heroIndex}`}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pointer-events-none absolute inset-y-0 right-0 z-[2] hidden w-[58%] md:block lg:w-[54%]"
          style={{
            WebkitMaskImage: [
              "linear-gradient(to left,  black 10%, rgba(0,0,0,.75) 42%, rgba(0,0,0,.2) 68%, transparent 92%)",
              "linear-gradient(to top,   transparent 0%,  black 22%)",
            ].join(", "),
            maskImage: [
              "linear-gradient(to left,  black 10%, rgba(0,0,0,.75) 42%, rgba(0,0,0,.2) 68%, transparent 92%)",
              "linear-gradient(to top,   transparent 0%,  black 22%)",
            ].join(", "),
            WebkitMaskComposite: "source-in",
            maskComposite:       "intersect",
          }}
        >
          {charImg && (
            <img
              src={charImg}
              alt={getTitle(item)}
              className="h-full w-full object-cover object-top"
              style={{ filter: "contrast(1.06) saturate(0.85)" }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(90deg,rgba(0,0,0,1)_0%,rgba(0,0,0,.97)_28%,rgba(0,0,0,.72)_46%,rgba(0,0,0,.12)_66%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-32 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-64 bg-gradient-to-t from-black via-black/88 to-transparent" />

      <div className="absolute inset-0 z-[4] flex flex-col justify-center pb-40 pt-20 pl-6 sm:pl-10 md:pl-14 lg:pl-20 sm:pt-24 md:pt-28">
        <motion.div
          key={`info-${heroIndex}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-[min(480px,56%)] flex-col items-start text-left"
        >
          <motion.h1
            key={`title-${heroIndex}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="mb-1 leading-[0.95] uppercase tracking-wide"
            style={{
              fontFamily: "'Creepster', 'Bebas Neue', 'Impact', cursive",
              fontSize: "clamp(36px, 5.5vw, 76px)",
              color: theme.accent,
              textShadow: `0 0 48px ${theme.accent}50, 0 3px 10px rgba(0,0,0,.95)`,
            }}
          >
            {getTitle(item)}
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="mb-3 text-[16px] font-semibold text-white/75 sm:text-[18px]"
            >
              {subtitle}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="mb-3 flex items-center gap-1"
          >
            {[1,2,3,4,5].map(i => (
              <Star
                key={i} size={18}
                className={i <= starCount ? "fill-[#ffd700] text-[#ffd700]" : "fill-white/15 text-white/15"}
              />
            ))}
            {imdbLabel && (
              <span className="ml-2.5 inline-flex items-center gap-1 rounded-full border border-[#e8a020]/30 bg-[#e8a020]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#e8a020]">
                <Star size={10} className="fill-[#e8a020] shrink-0" />
                {imdbLabel}
              </span>
            )}
          </motion.div>

          {genres.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="mb-5 flex flex-wrap items-center gap-1.5"
            >
              {genres.map((g) => (
                <span key={g} className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-[3px] text-[12px] font-medium text-white/70">
                  {g}
                </span>
              ))}
            </motion.div>
          )}

          {item.overview && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.30 }}
              className="mb-7 max-w-[350px] text-[13px] leading-[1.82] text-white/62 md:text-[13.5px]"
            >
              {item.overview.slice(0, 180)}{item.overview.length > 180 ? "…" : ""}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 }}
            className="relative z-10 flex items-center gap-3 pointer-events-auto"
          >
            {trailerKey ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, filter: "brightness(1.12)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.open(`https://www.youtube.com/watch?v=${trailerKey}`, "_blank")}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-[10px] text-[13px] font-bold text-white transition"
                style={{ background: theme.btnBg, boxShadow: `0 4px 28px ${theme.btnShadow}` }}
              >
                <Play size={12} className="fill-white shrink-0" />
                Watch Trailer
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, filter: "brightness(1.12)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onOpen(item, mediaType)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-[10px] text-[13px] font-bold text-white transition"
                style={{ background: theme.btnBg, boxShadow: `0 4px 28px ${theme.btnShadow}` }}
              >
                <Play size={12} className="fill-white shrink-0" />
                Watch
              </motion.button>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.09)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onOpen(item, mediaType)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/38 bg-transparent px-5 py-[10px] text-[13px] font-semibold text-white/80 backdrop-blur-sm transition hover:border-white/60 hover:text-white"
            >
              <Info size={13} className="shrink-0" />
              More Info
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 inset-x-0 z-[5] flex flex-col items-center pb-5">
        <div className="flex items-end justify-center gap-3 px-4">
          <AnimatePresence mode="popLayout">
            {carouselIndices.map((idx, pos) => {
              const entry    = sourceItems[idx];
              const isActive = idx === heroIndex;
              const dist     = Math.abs(pos - half);
              const sizes = [
                { h: 62, w: 44 },
                { h: 82, w: 57 },
                { h: 128, w: 88 },
              ];
              const { h, w } = sizes[Math.max(0, 2 - dist)];
              const opacity  = isActive ? 1 : dist === 1 ? 0.68 : 0.42;
              const ep = entry.poster_path
                ? `https://image.tmdb.org/t/p/w185${entry.poster_path}`
                : entry.backdrop_path
                  ? `https://image.tmdb.org/t/p/w300${entry.backdrop_path}`
                  : "";

              return (
                <motion.button
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.82 }}
                  whileHover={!isActive ? { scale: 1.12, opacity: 0.92, y: -6 } : undefined}
                  transition={{ duration: 0.3, delay: pos * 0.04 }}
                  onClick={() => setHeroIndex(idx)}
                  style={{
                    width: w, height: h,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: isActive
                      ? "2px solid #e8a020"
                      : "2px solid rgba(255,255,255,0.07)",
                    boxShadow: isActive
                      ? "0 0 22px rgba(232,160,32,0.55), 0 8px 32px rgba(0,0,0,.85)"
                      : "0 4px 16px rgba(0,0,0,.6)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {ep ? (
                    <img src={ep} alt={getTitle(entry)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/[0.05]">
                      <Film size={12} className="text-white/20" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
