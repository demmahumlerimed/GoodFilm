/**
 * GoodFilm — Mood Browse (Phase 4)
 *
 * A mood-first discovery surface. Users pick a feeling and we map that to
 * TMDb `/discover/{movie|tv}` parameters (with_genres, sort_by,
 * vote_average.gte, primary_release_date filters, etc.).
 *
 * UX pattern (inspired by xprime.stream/mood, re-styled brand-native):
 *   - Mood chips stay persistently visible above results (never hidden)
 *   - Hero title dynamically becomes the selected mood's name in its accent
 *     color, with a per-mood subtitle ("For the heart", "For the adrenaline")
 *   - Ambient background glow swaps to the mood's gradient on selection
 *   - Collapsible "describe something specific" free-form input that falls
 *     back to TMDb `/search/multi` keyword search
 *   - Amber warning empty-state card
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  Film,
  Loader2,
  Search,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import { tmdbFetch } from "../../services/tmdb";
import { analyzeMoodQuery, isGeminiAvailable } from "../../services/gemini";
import { POSTER_BASE, BACKDROP_BASE } from "../../config";
import { cn } from "../../utils/cn";
import { getTitle, getYear } from "../../utils/library";
import type { MediaItem, MediaType } from "../../types";

// ── Mood taxonomy ────────────────────────────────────────────────────────────

export type MoodKey =
  | "cozy"
  | "adventurous"
  | "date-night"
  | "mind-bending"
  | "nostalgic"
  | "heartbreaker"
  | "laugh"
  | "edge-of-seat"
  | "chill"
  | "epic"
  | "wholesome"
  | "dark";

type MoodDef = {
  key: MoodKey;
  label: string;
  emoji: string;
  subtitle: string; // "For the heart" style tagline
  blurb: string;
  /** Tailwind text-color class for the dynamic hero title. */
  accentText: string;
  /** Raw rgba used for ambient background glow (r,g,b numeric only). */
  glowRgb: string;
  gradient: string; // tailwind bg-gradient classes (for chips)
  params: {
    with_genres?: string;
    with_keywords?: string;
    without_keywords?: string;
    sort_by?: string;
    "vote_count.gte"?: number;
    "vote_average.gte"?: number;
    yearFrom?: number;
    yearTo?: number;
  };
};

const MOODS: MoodDef[] = [
  {
    key: "cozy",
    label: "Cozy",
    emoji: "🧸",
    subtitle: "For quiet nights in",
    blurb: "Warm, gentle stories to wind down with.",
    accentText: "text-[#e8a020]",
    glowRgb: "239,180,63",
    gradient: "from-[#e8a020]/25 via-[#c97d0a]/15 to-transparent",
    params: {
      with_genres: "10751,10749,35",
      sort_by: "vote_average.desc",
      "vote_count.gte": 400,
      "vote_average.gte": 7.0,
    },
  },
  {
    key: "adventurous",
    label: "Adventurous",
    emoji: "🗺️",
    subtitle: "For the explorer",
    blurb: "Sweeping journeys and thrills.",
    accentText: "text-[#3db48e]",
    glowRgb: "61,180,142",
    gradient: "from-[#3db48e]/25 via-[#1f7a5d]/15 to-transparent",
    params: {
      with_genres: "12,28",
      sort_by: "popularity.desc",
      "vote_count.gte": 500,
    },
  },
  {
    key: "date-night",
    label: "Date Night",
    emoji: "💘",
    subtitle: "For two on the couch",
    blurb: "Chemistry, banter, and happy endings.",
    accentText: "text-[#e64a6b]",
    glowRgb: "230,74,107",
    gradient: "from-[#e64a6b]/25 via-[#8c1e3a]/15 to-transparent",
    params: {
      with_genres: "10749,35",
      sort_by: "vote_average.desc",
      "vote_count.gte": 600,
      "vote_average.gte": 6.8,
    },
  },
  {
    key: "mind-bending",
    label: "Mind-Bending",
    emoji: "🌀",
    subtitle: "For your brain",
    blurb: "Puzzles, paradoxes, and reality shifts.",
    accentText: "text-[#6b7cff]",
    glowRgb: "107,124,255",
    gradient: "from-[#6b7cff]/25 via-[#2e3a8c]/15 to-transparent",
    params: {
      with_genres: "878,53,9648",
      sort_by: "vote_average.desc",
      "vote_count.gte": 800,
      "vote_average.gte": 7.2,
    },
  },
  {
    key: "nostalgic",
    label: "Nostalgic",
    emoji: "📼",
    subtitle: "For throwback nights",
    blurb: "Classics and throwbacks you grew up with.",
    accentText: "text-[#d49a4a]",
    glowRgb: "212,154,74",
    gradient: "from-[#d49a4a]/25 via-[#6f4a1e]/15 to-transparent",
    params: {
      with_genres: "10751,16,12",
      sort_by: "vote_average.desc",
      "vote_count.gte": 800,
      "vote_average.gte": 7.0,
      yearFrom: 1980,
      yearTo: 2009,
    },
  },
  {
    key: "heartbreaker",
    label: "Heartbreaker",
    emoji: "💔",
    subtitle: "For the heart",
    blurb: "Bring tissues. These hit hard.",
    accentText: "text-[#b04a77]",
    glowRgb: "176,74,119",
    gradient: "from-[#b04a77]/25 via-[#3d1529]/15 to-transparent",
    params: {
      with_genres: "18,10749",
      sort_by: "vote_average.desc",
      "vote_count.gte": 800,
      "vote_average.gte": 7.4,
    },
  },
  {
    key: "laugh",
    label: "Laugh-Out-Loud",
    emoji: "😂",
    subtitle: "For a good time",
    blurb: "Pure comfort comedy.",
    accentText: "text-[#f0c94a]",
    glowRgb: "240,201,74",
    gradient: "from-[#f0c94a]/25 via-[#7a5a10]/15 to-transparent",
    params: {
      with_genres: "35",
      sort_by: "vote_average.desc",
      "vote_count.gte": 800,
      "vote_average.gte": 7.0,
    },
  },
  {
    key: "edge-of-seat",
    label: "Edge-of-Seat",
    emoji: "⚡",
    subtitle: "For the adrenaline",
    blurb: "Tight, tense, can't-look-away.",
    accentText: "text-[#ff6b3d]",
    glowRgb: "255,107,61",
    gradient: "from-[#ff6b3d]/25 via-[#7a2a12]/15 to-transparent",
    params: {
      with_genres: "53,28,80",
      sort_by: "popularity.desc",
      "vote_count.gte": 1000,
      "vote_average.gte": 7.0,
    },
  },
  {
    key: "chill",
    label: "Chill",
    emoji: "🌿",
    subtitle: "For easy watching",
    blurb: "Easy watches. Low commitment.",
    accentText: "text-[#7cd4a0]",
    glowRgb: "124,212,160",
    gradient: "from-[#7cd4a0]/25 via-[#1e5a3d]/15 to-transparent",
    params: {
      with_genres: "35,10751,16",
      sort_by: "popularity.desc",
      "vote_count.gte": 600,
    },
  },
  {
    key: "epic",
    label: "Epic",
    emoji: "🏛️",
    subtitle: "For the big screen",
    blurb: "Huge scope. Bigger stakes.",
    accentText: "text-[#c7a46b]",
    glowRgb: "199,164,107",
    gradient: "from-[#c7a46b]/25 via-[#4a3518]/15 to-transparent",
    params: {
      with_genres: "12,14,36,10752",
      sort_by: "vote_average.desc",
      "vote_count.gte": 1000,
      "vote_average.gte": 7.5,
    },
  },
  {
    key: "wholesome",
    label: "Wholesome",
    emoji: "🌻",
    subtitle: "For feeling good",
    blurb: "Kind, hopeful, feel-good.",
    accentText: "text-[#f4d35e]",
    glowRgb: "244,211,94",
    gradient: "from-[#f4d35e]/25 via-[#7d6419]/15 to-transparent",
    params: {
      with_genres: "10751,16,35",
      without_keywords: "9714,10714",
      sort_by: "vote_average.desc",
      "vote_count.gte": 600,
      "vote_average.gte": 7.2,
    },
  },
  {
    key: "dark",
    label: "Dark & Twisted",
    emoji: "🕯️",
    subtitle: "For shadowy minds",
    blurb: "Shadows, crime, things unspoken.",
    accentText: "text-[#b49cff]",
    glowRgb: "180,156,255",
    gradient: "from-[#5a3d7a]/25 via-[#231235]/15 to-transparent",
    params: {
      with_genres: "80,27,9648,53",
      sort_by: "vote_average.desc",
      "vote_count.gte": 700,
      "vote_average.gte": 7.0,
    },
  },
];

// TV genre remap — TMDb uses different IDs for several categories on /tv.
const TV_GENRE_REMAP: Record<string, string> = {
  "28": "10759",
  "12": "10759",
  "878": "10765",
  "14": "10765",
  "10752": "10768",
};

function remapGenresForTv(csv: string | undefined): string | undefined {
  if (!csv) return csv;
  const mapped = csv
    .split(",")
    .map((g) => TV_GENRE_REMAP[g.trim()] ?? g.trim())
    .filter(Boolean);
  // Use "|" (OR) instead of "," (AND) — TV genre tagging is inconsistent
  // and AND-logic across 3+ genres returns near-zero results.
  return Array.from(new Set(mapped)).join("|");
}

// Rotating placeholders for the free-form input.
const FREE_PLACEHOLDERS = [
  "Dark mysteries with plot twists…",
  "Intense dramas that keep you guessing…",
  "Feel-good movies for a rainy Sunday…",
  "Sci-fi that melts your brain…",
  "Slow-burn thrillers with a body count…",
];

// ── Component ────────────────────────────────────────────────────────────────

type TypeFilter = "movie" | "tv" | "both";

export default function MoodBrowse({
  onOpen,
}: {
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
}) {
  const [selected, setSelected] = useState<MoodKey | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("both");
  const [results, setResults] = useState<Array<MediaItem & { _mediaType: MediaType }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free-form input
  const [freeOpen, setFreeOpen] = useState(false);
  const [freeQuery, setFreeQuery] = useState("");
  const [freeSubmitted, setFreeSubmitted] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Rotate free-form placeholder
  useEffect(() => {
    if (!freeOpen) return;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % FREE_PLACEHOLDERS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [freeOpen]);

  const selectedMood = useMemo(
    () => MOODS.find((m) => m.key === selected) ?? null,
    [selected]
  );

  // Discover fetch (mood path)
  useEffect(() => {
    if (!selectedMood) return;
    // Clear any pending free-form result — mood takes precedence
    setFreeSubmitted(null);

    let cancelled = false;
    setLoading(true);
    setError(null);

    const buildParams = (mt: MediaType) => {
      const p = selectedMood.params;
      const params: Record<string, string | number> = {
        sort_by: p.sort_by || "popularity.desc",
        include_adult: "false",
        page: 1,
      };
      if (p.with_genres) {
        const g = mt === "tv" ? remapGenresForTv(p.with_genres) : p.with_genres;
        if (g) params.with_genres = g;
      }
      if (p.with_keywords) params.with_keywords = p.with_keywords;
      if (p.without_keywords) params.without_keywords = p.without_keywords;
      if (p["vote_count.gte"] !== undefined) {
        // TV shows accumulate fewer votes than films — halve the threshold
        params["vote_count.gte"] = mt === "tv"
          ? Math.max(50, Math.floor(p["vote_count.gte"]! / 2))
          : p["vote_count.gte"]!;
      }
      if (p["vote_average.gte"] !== undefined) params["vote_average.gte"] = p["vote_average.gte"];
      if (p.yearFrom !== undefined) {
        const k = mt === "movie" ? "primary_release_date.gte" : "first_air_date.gte";
        params[k] = `${p.yearFrom}-01-01`;
      }
      if (p.yearTo !== undefined) {
        const k = mt === "movie" ? "primary_release_date.lte" : "first_air_date.lte";
        params[k] = `${p.yearTo}-12-31`;
      }
      return params;
    };

    (async () => {
      try {
        const tasks: Array<Promise<Array<MediaItem & { _mediaType: MediaType }>>> = [];
        if (typeFilter === "movie" || typeFilter === "both") {
          tasks.push(
            tmdbFetch<{ results?: MediaItem[] }>("/discover/movie", buildParams("movie")).then(
              (r) => (r.results || []).map((x) => ({ ...x, _mediaType: "movie" as MediaType }))
            )
          );
        }
        if (typeFilter === "tv" || typeFilter === "both") {
          tasks.push(
            tmdbFetch<{ results?: MediaItem[] }>("/discover/tv", buildParams("tv")).then(
              (r) => (r.results || []).map((x) => ({ ...x, _mediaType: "tv" as MediaType }))
            )
          );
        }
        const chunks = await Promise.all(tasks);
        if (cancelled) return;
        const merged = chunks.flat();
        merged.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
        setResults(merged.slice(0, 40));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load mood picks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMood, typeFilter]);

  // Free-form fetch — Gemini-powered when key is available, plain search fallback
  useEffect(() => {
    if (!freeSubmitted) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelected(null);

    (async () => {
      try {
        // ── Gemini path ───────────────────────────────────────────────────────
        if (isGeminiAvailable) {
          setGeminiLoading(true);
          let params = await analyzeMoodQuery(freeSubmitted).catch(() => null);
          if (cancelled) return;
          setGeminiLoading(false);

          if (params) {
            // If Gemini wants a direct title/person search, honour it
            if (params.searchQuery) {
              const r = await tmdbFetch<{ results?: Array<MediaItem & { media_type?: string }> }>(
                "/search/multi",
                { query: params.searchQuery, include_adult: "false", page: 1 }
              );
              if (cancelled) return;
              const filtered = (r.results || [])
                .filter((x) => x.media_type === "movie" || x.media_type === "tv")
                .map((x) => ({ ...x, _mediaType: (x.media_type as MediaType) || "movie" }))
                .filter((x) => typeFilter === "both" || x._mediaType === typeFilter)
                .slice(0, 40);
              setResults(filtered as Array<MediaItem & { _mediaType: MediaType }>);
              return;
            }

            // Otherwise use /discover with structured params
            const resolvedType = params.type ?? "both";
            const buildDiscoverParams = (mt: MediaType) => {
              const p: Record<string, string | number> = {
                sort_by: params!.sort_by ?? "vote_average.desc",
                include_adult: "false",
                page: 1,
              };
              if (params!.with_genres) {
                // Remap genre IDs for TV
                const genres = mt === "tv"
                  ? params!.with_genres.split(",").map(g => {
                      const remap: Record<string,string> = { "28":"10759","12":"10759","878":"10765","14":"10765","10752":"10768" };
                      return remap[g.trim()] ?? g.trim();
                    }).filter(Boolean).join(",")
                  : params!.with_genres;
                if (genres) p.with_genres = genres;
              }
              if (params!["vote_average.gte"]) p["vote_average.gte"] = params!["vote_average.gte"]!;
              if (params!["vote_count.gte"])   p["vote_count.gte"]   = params!["vote_count.gte"]!;
              if (params!.yearFrom) p[mt === "movie" ? "primary_release_date.gte" : "first_air_date.gte"] = `${params!.yearFrom}-01-01`;
              if (params!.yearTo)   p[mt === "movie" ? "primary_release_date.lte" : "first_air_date.lte"] = `${params!.yearTo}-12-31`;
              return p;
            };

            const tasks: Promise<Array<MediaItem & { _mediaType: MediaType }>>[] = [];
            if (resolvedType === "movie" || resolvedType === "both") {
              tasks.push(
                tmdbFetch<{ results?: MediaItem[] }>("/discover/movie", buildDiscoverParams("movie"))
                  .then(r => (r.results || []).map(x => ({ ...x, _mediaType: "movie" as MediaType })))
              );
            }
            if (resolvedType === "tv" || resolvedType === "both") {
              tasks.push(
                tmdbFetch<{ results?: MediaItem[] }>("/discover/tv", buildDiscoverParams("tv"))
                  .then(r => (r.results || []).map(x => ({ ...x, _mediaType: "tv" as MediaType })))
              );
            }

            const chunks = await Promise.all(tasks);
            if (cancelled) return;
            const merged = chunks.flat()
              .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
              .filter(x => typeFilter === "both" || x._mediaType === typeFilter)
              .slice(0, 40);
            setResults(merged as Array<MediaItem & { _mediaType: MediaType }>);
            return;
          }
          // Gemini returned null (parse failed) — fall through to plain search
        }

        // ── Plain search fallback (no Gemini key or Gemini failed) ────────────
        const r = await tmdbFetch<{ results?: Array<MediaItem & { media_type?: string }> }>(
          "/search/multi",
          { query: freeSubmitted, include_adult: "false", page: 1 }
        );
        if (cancelled) return;
        const filtered = (r.results || [])
          .filter((x) => x.media_type === "movie" || x.media_type === "tv")
          .map((x) => ({ ...x, _mediaType: (x.media_type as MediaType) || "movie" }))
          .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
          .filter((x) => typeFilter === "both" || x._mediaType === typeFilter)
          .slice(0, 40);
        setResults(filtered as Array<MediaItem & { _mediaType: MediaType }>);
      } catch (e) {
        if (cancelled) return;
        setGeminiLoading(false);
        setError(e instanceof Error ? e.message : "Search failed.");
      } finally {
        if (!cancelled) { setLoading(false); setGeminiLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [freeSubmitted, typeFilter]);

  const glow = selectedMood?.glowRgb ?? "239,180,63";
  const heroTitle = selectedMood
    ? selectedMood.label
    : freeSubmitted
    ? "Your Pick"
    : "What's Your Mood?";
  const heroSubtitle = selectedMood
    ? selectedMood.subtitle
    : freeSubmitted
    ? `Matches for "${freeSubmitted}"`
    : "Pick a vibe. We'll find your watch.";
  const heroAccent = selectedMood?.accentText ?? "text-white";

  const showingResults = Boolean(selectedMood) || Boolean(freeSubmitted);

  return (
    <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14">
      {/* Ambient background glow — swaps per mood */}
      <motion.div
        key={selectedMood?.key ?? (freeSubmitted ? "free" : "idle")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%, rgba(${glow},0.18), transparent 70%)`,
        }}
      />

      <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-8 sm:pt-14 pb-10">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              background: `rgba(${glow},0.15)`,
              color: `rgb(${glow})`,
            }}
          >
            <Sparkles size={20} />
          </div>
          <AnimatePresence mode="wait">
            <motion.h1
              key={heroTitle}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "text-[32px] font-black tracking-[-0.04em] sm:text-[48px] md:text-[56px]",
                heroAccent
              )}
              style={selectedMood ? { color: `rgb(${glow})` } : undefined}
            >
              {selectedMood && <span className="mr-2 align-middle">{selectedMood.emoji}</span>}
              {heroTitle}
            </motion.h1>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={heroSubtitle}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="mt-2 text-[13px] tracking-wide text-white/50 sm:text-[14px]"
            >
              {heroSubtitle}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Persistent mood chips row ────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-2.5">
          {MOODS.map((mood) => {
            const active = selected === mood.key;
            return (
              <motion.button
                key={mood.key}
                onClick={() => {
                  setFreeSubmitted(null);
                  setFreeQuery("");
                  setSelected(active ? null : mood.key);
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center gap-1.5 overflow-hidden rounded-full border px-4 py-2.5 text-[13px] font-semibold transition",
                  active
                    ? "border-transparent bg-white/[0.06] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
                )}
                style={
                  active
                    ? {
                        boxShadow: `0 0 0 1.5px rgba(${mood.glowRgb},0.55), 0 0 24px rgba(${mood.glowRgb},0.18)`,
                      }
                    : undefined
                }
              >
                <span className="text-[15px] leading-none">{mood.emoji}</span>
                <span>{mood.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* ── Free-form "describe something specific" toggle ───────────────── */}
        <div className="mx-auto mt-5 flex max-w-2xl flex-col items-center">
          <button
            onClick={() => setFreeOpen((v) => !v)}
            className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-white/50 transition hover:text-white/80"
          >
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform duration-300",
                freeOpen ? "rotate-180" : "rotate-0"
              )}
            />
            describe something specific
          </button>

          <AnimatePresence initial={false}>
            {freeOpen && (
              <motion.form
                key="free-input"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = freeQuery.trim();
                  if (!q) return;
                  setFreeSubmitted(q);
                }}
                className="w-full overflow-hidden"
              >
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                  />
                  <input
                    type="text"
                    value={freeQuery}
                    onChange={(e) => setFreeQuery(e.target.value)}
                    placeholder={FREE_PLACEHOLDERS[placeholderIdx]}
                    className="w-full rounded-full border border-white/10 bg-white/[0.03] py-3 pl-11 pr-24 text-[13.5px] text-white placeholder-white/30 outline-none transition focus:border-[#e8a020]/40 focus:bg-white/[0.05]"
                  />
                  <button
                    type="submit"
                    disabled={!freeQuery.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#e8a020] px-4 py-1.5 text-[11.5px] font-bold text-black transition enabled:hover:bg-[#f5c96a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Find
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* ── Results section ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {showingResults && (
            <motion.div
              key={selected ?? freeSubmitted ?? "none"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              className="mt-10"
            >
              {/* Type filter */}
              <div className="mb-5 flex items-center justify-center">
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1">
                  {[
                    { key: "both" as TypeFilter, label: "All" },
                    { key: "movie" as TypeFilter, label: "Movies" },
                    { key: "tv" as TypeFilter, label: "Series" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setTypeFilter(f.key)}
                      className={cn(
                        "relative rounded-full px-4 py-2 text-[13px] font-semibold transition",
                        typeFilter === f.key
                          ? "bg-[#e8a020] text-black"
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  {geminiLoading ? (
                    <>
                      <div className="relative flex h-10 w-10 items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-[#e8a020]/10 animate-ping" />
                        <Sparkles size={20} className="text-[#e8a020] animate-pulse" />
                      </div>
                      <p className="text-[13px] font-medium text-white/50">
                        AI is thinking<span className="animate-pulse">…</span>
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center text-white/40">
                      <Loader2 size={20} className="mr-2 animate-spin" /> Curating…
                    </div>
                  )}
                </div>
              ) : error ? (
                <div className="mx-auto max-w-lg rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-[13px] text-red-300">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <div className="mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-[13px] text-amber-200/90">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                  <div>
                    <div className="font-semibold text-amber-100">
                      Oops! No recommendations found for your mood.
                    </div>
                    <div className="mt-0.5 text-[12px] text-amber-200/70">
                      Try a different vibe, or loosen the type filter.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 md:gap-4">
                  {results.map((item) => (
                    <button
                      key={`${item._mediaType}-${item.id}`}
                      onClick={() => onOpen(item, item._mediaType)}
                      className="group text-left"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.04] ring-1 ring-white/5 transition group-hover:ring-[#e8a020]/40">
                        {item.poster_path ? (
                          <img
                            src={`${POSTER_BASE}${item.poster_path}`}
                            alt={getTitle(item)}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                          />
                        ) : item.backdrop_path ? (
                          <img
                            src={`${BACKDROP_BASE}${item.backdrop_path}`}
                            alt={getTitle(item)}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/15">
                            <Film size={22} />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white/80 backdrop-blur">
                          {item._mediaType === "tv" ? (
                            <Tv size={9} className="text-[#e8a020]" />
                          ) : (
                            <Film size={9} className="text-[#e8a020]" />
                          )}
                          {item._mediaType === "tv" ? "TV" : "Movie"}
                        </div>
                        {(item.vote_average ?? 0) > 0 && (
                          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 backdrop-blur-sm">
                            <Star size={8} className="fill-[#e8a020] text-[#e8a020]" />
                            <span className="text-[11px] font-bold text-white">
                              {Number(item.vote_average).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-white/80">
                        {getTitle(item)}
                      </div>
                      <div className="mt-0.5 text-[12px] text-white/40">{getYear(item)}</div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
