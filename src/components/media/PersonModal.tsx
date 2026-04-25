import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Film, Plus, RefreshCw, Star, User, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { POSTER_BASE } from "../../config";
import { tmdbFetch } from "../../services/tmdb";
import type { MediaItem, MediaType } from "../../types";

type PersonDetail = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  profile_path?: string | null;
  known_for_department?: string;
};
type PersonCredit = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  character?: string;
  job?: string;
  media_type?: string;
};

export function PersonModal({
  open, personId, onClose, onOpenItem, isFollowed, onToggleFollow,
}: {
  open: boolean; personId: number | null; onClose: () => void;
  onOpenItem: (item: MediaItem, mediaType: MediaType) => void;
  isFollowed: boolean;
  onToggleFollow: (person: { id: number; name: string; profilePath: string | null; knownFor: string }) => void;
}) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [castCredits, setCastCredits] = useState<PersonCredit[]>([]);
  const [crewCredits, setCrewCredits] = useState<PersonCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [externalIds, setExternalIds] = useState<{ instagram_id?: string; twitter_id?: string; imdb_id?: string } | null>(null);
  const [dept, setDept] = useState<"cast" | "crew">("cast");
  const [mediaFilter, setMediaFilter] = useState<"movie" | "tv">("movie");
  const [sort, setSort] = useState<"popular" | "newest" | "upcoming">("popular");
  const [bioExpanded, setBioExpanded] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!open || !personId) return;
    setPerson(null); setCastCredits([]); setCrewCredits([]);
    setBackdropUrl(null); setExternalIds(null); setLoading(true); setBioExpanded(false);
    Promise.all([
      tmdbFetch<PersonDetail>(`/person/${personId}`),
      tmdbFetch<{ cast: PersonCredit[]; crew: PersonCredit[] }>(`/person/${personId}/combined_credits`),
      tmdbFetch<{ instagram_id?: string; twitter_id?: string; imdb_id?: string }>(`/person/${personId}/external_ids`).catch(() => ({})),
    ]).then(([p, c, ext]) => {
      setPerson(p);
      setExternalIds(ext);
      const dedup = (arr: PersonCredit[]) => {
        const seen = new Set<number>();
        return arr.filter(x => x.poster_path && !seen.has(x.id) && seen.add(x.id));
      };
      const cast = dedup(c.cast || []);
      const crew = dedup(c.crew || []);
      setCastCredits(cast);
      setCrewCredits(crew);
      const startDept = p.known_for_department === "Directing" && crew.length > 0 ? "crew" : "cast";
      setDept(startDept);
      const src = startDept === "cast" ? cast : crew;
      setMediaFilter(src.filter(x => x.media_type === "movie").length >= src.filter(x => x.media_type === "tv").length ? "movie" : "tv");
      const all = [...cast, ...crew].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      const topBackdrop = all.find(x => x.backdrop_path);
      if (topBackdrop?.backdrop_path) {
        setBackdropUrl(`https://image.tmdb.org/t/p/w1280${topBackdrop.backdrop_path}`);
      } else if (all[0]?.poster_path) {
        setBackdropUrl(`${POSTER_BASE}${all[0].poster_path}`);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, personId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sourceCredits = dept === "cast" ? castCredits : crewCredits;
  const filtered = sourceCredits.filter(c => {
    if ((c.media_type === "tv" ? "tv" : "movie") !== mediaFilter) return false;
    if (sort === "upcoming") {
      const d = c.release_date || c.first_air_date;
      return !d || d > today;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) =>
    sort === "newest"
      ? (b.release_date || b.first_air_date || "").localeCompare(a.release_date || a.first_air_date || "")
      : (b.vote_average || 0) - (a.vote_average || 0)
  );

  const hasBothDepts = castCredits.length > 0 && crewCredits.length > 0;
  const bio = person?.biography || "";
  const castMovies = castCredits.filter(x => x.media_type === "movie").length;
  const castTV    = castCredits.filter(x => x.media_type === "tv").length;
  const directedN = crewCredits.filter(x => x.job === "Director").length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] overflow-y-auto bg-black/88 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="flex min-h-full items-start justify-center py-0 sm:py-8 sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.97 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-[860px] rounded-none sm:rounded-[20px] border-0 sm:border sm:border-white/[0.08] bg-[#0a0c12] shadow-[0_60px_120px_rgba(0,0,0,0.9)]"
          >
            {loading || !person ? (
              <div className="flex h-72 items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                  <RefreshCw size={24} className="text-white/20" />
                </motion.div>
              </div>
            ) : (
              <>
                {/* ════════════ HERO BACKDROP ════════════ */}
                <div className="relative h-[185px] sm:h-[240px] overflow-hidden rounded-t-none sm:rounded-t-[20px]">
                  {backdropUrl ? (
                    <img src={backdropUrl} alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top scale-[1.08]"
                      style={{ filter: "blur(32px)", opacity: 0.2 }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1c1a3e] via-[#100e24] to-[#0a0c12]" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-[#0a0c12]/45 to-[#0a0c12]" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0c12]/60 via-transparent to-[#0a0c12]/20" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_25%_0%,rgba(239,180,63,0.07),transparent_70%)]" />
                  <button onClick={onClose} aria-label="Close"
                    className="absolute right-4 top-4 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 backdrop-blur-sm transition-all duration-150 hover:border-white/22 hover:bg-black/70 hover:text-white">
                    <X size={15} />
                  </button>
                </div>

                {/* ════════════ AVATAR + META ════════════ */}
                <div className="-mt-12 sm:-mt-14 px-5 sm:px-8 relative z-10">
                  <div className="flex items-end gap-4 sm:gap-5">
                    <div className="shrink-0 h-[96px] w-[96px] sm:h-[108px] sm:w-[108px] overflow-hidden rounded-full border-[3.5px] border-[#0a0c12] shadow-[0_8px_40px_rgba(0,0,0,0.75)] ring-[1.5px] ring-white/10">
                      {person.profile_path
                        ? <img src={`${POSTER_BASE}${person.profile_path}`} alt={person.name} className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full items-center justify-center bg-white/[0.07] text-white/20"><User size={38} /></div>}
                    </div>
                    <div className="pb-1.5 min-w-0 flex-1">
                      <h2 className="text-[20px] sm:text-[26px] font-black tracking-[-0.03em] text-white leading-tight truncate">{person.name}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {person.known_for_department && (
                          <span className={cn(
                            "rounded-[6px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            person.known_for_department === "Directing"
                              ? "bg-[#e8a020]/10 border-[#e8a020]/25 text-[#e8a020]/75"
                              : "bg-white/[0.05] border-white/10 text-white/40"
                          )}>{person.known_for_department}</span>
                        )}
                        {person.birthday && (
                          <span className="text-[11px] text-white/30 truncate">
                            {person.birthday}{person.place_of_birth ? ` · ${person.place_of_birth.split(",")[0].trim()}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 mb-4 flex items-center gap-5 sm:gap-8 border-b border-white/[0.05] pb-4">
                    {[
                      { n: castMovies + castTV, label: "Acting"   },
                      { n: castMovies,           label: "Movies"  },
                      { n: castTV,               label: "TV"      },
                      ...(directedN > 0 ? [{ n: directedN, label: "Directed" }] : []),
                    ].map(({ n, label }) => (
                      <div key={label} className="text-center">
                        <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tabular-nums">{n}</div>
                        <div className="text-[10px] text-white/28 mt-0.5 uppercase tracking-wider">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Follow + Socials row */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => onToggleFollow({ id: person.id, name: person.name, profilePath: person.profile_path || null, knownFor: person.known_for_department || "Actor" })}
                      className={cn(
                        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[12px] font-bold transition-all duration-200",
                        isFollowed
                          ? "bg-[#e8a020] text-black shadow-[0_4px_18px_rgba(239,180,63,0.28)] hover:brightness-105"
                          : "border border-white/12 bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white"
                      )}>
                      {isFollowed ? <><Check size={12} className="shrink-0" />Following</> : <><Plus size={12} className="shrink-0" />Follow</>}
                    </motion.button>

                    <a href={externalIds?.imdb_id ? `https://www.imdb.com/name/${externalIds.imdb_id}` : `https://www.imdb.com/find/?q=${encodeURIComponent(person.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#f5c518]/22 bg-[#f5c518]/7 px-3 text-[11px] font-bold text-[#f5c518] transition-all duration-200 hover:bg-[#f5c518]/14">
                      <span className="rounded-[3px] bg-[#f5c518] px-1.5 py-[2px] text-[11px] font-black text-black leading-none">IMDb</span>
                    </a>

                    {externalIds?.instagram_id && (
                      <a href={`https://instagram.com/${externalIds.instagram_id}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/35 backdrop-blur-sm transition-all duration-200 hover:border-[#E1306C]/30 hover:bg-[#E1306C]/8 hover:text-[#E1306C]">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[14px] w-[14px]"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      </a>
                    )}

                    {externalIds?.twitter_id && (
                      <a href={`https://twitter.com/${externalIds.twitter_id}`} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/35 backdrop-blur-sm transition-all duration-200 hover:border-[#1DA1F2]/28 hover:bg-[#1DA1F2]/8 hover:text-[#1DA1F2]">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[14px] w-[14px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.834L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                  </div>

                  {/* Bio */}
                  {bio && (
                    <div className="mb-5 border-b border-white/[0.05] pb-5">
                      <p className={cn(
                        "text-[13px] leading-[1.85] text-white/48 transition-all duration-200",
                        !bioExpanded && "line-clamp-3"
                      )}>{bio}</p>
                      {bio.length > 200 && (
                        <button onClick={() => setBioExpanded(v => !v)}
                          className="mt-1.5 cursor-pointer text-[12px] font-semibold text-[#e8a020]/65 transition-colors duration-150 hover:text-[#e8a020]">
                          {bioExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ════════════ STICKY FILTER BAR ════════════ */}
                <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0c12]/96 px-5 sm:px-8 py-2.5 flex flex-wrap items-center gap-2 [backdrop-filter:blur(20px)]">
                  {hasBothDepts && (
                    <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                      {(["cast", "crew"] as const).map(d => (
                        <button key={d} onClick={() => setDept(d)}
                          className={cn(
                            "cursor-pointer px-3.5 py-[6px] text-[11px] font-semibold transition-all duration-150",
                            dept === d ? "bg-white/14 text-white" : "text-white/35 hover:text-white/65"
                          )}>
                          {d === "cast" ? "Acting" : "Crew"}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                    {([["movie", "Movies"], ["tv", "TV"]] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setMediaFilter(v)}
                        className={cn(
                          "cursor-pointer px-3.5 py-[6px] text-[11px] font-semibold transition-all duration-150",
                          mediaFilter === v ? "bg-white/14 text-white" : "text-white/35 hover:text-white/65"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                    {([["popular", "Popular"], ["newest", "Newest"], ["upcoming", "Upcoming"]] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setSort(v)}
                        className={cn(
                          "cursor-pointer px-3.5 py-[6px] text-[11px] font-semibold transition-all duration-150",
                          sort === v
                            ? v === "upcoming" ? "bg-emerald-500/16 text-emerald-400" : "bg-white/14 text-white"
                            : "text-white/35 hover:text-white/65"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <span className="ml-auto text-[11px] text-white/22 tabular-nums font-medium">
                    {sorted.length} title{sorted.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* ════════════ FILMOGRAPHY GRID ════════════ */}
                <div className="px-5 sm:px-8 pt-5 pb-8">
                  {sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <Film size={32} className="text-white/10" />
                      <p className="text-[13px] text-white/28">
                        No {mediaFilter === "movie" ? "movies" : "TV shows"}{sort === "upcoming" ? " upcoming" : ""} found
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      key={`${dept}-${mediaFilter}-${sort}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6"
                    >
                      {sorted.map(credit => {
                        const mt: MediaType = credit.media_type === "tv" ? "tv" : "movie";
                        const dateStr = credit.release_date || credit.first_air_date || "";
                        const isUpcoming = Boolean(dateStr) && dateStr > today;
                        const roleLabel = dept === "cast" ? credit.character : credit.job;

                        return (
                          <motion.div
                            key={`${credit.id}-${credit.media_type}-${dept}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            onClick={() => onOpenItem(credit as unknown as MediaItem, mt)}
                            className="cursor-pointer group"
                          >
                            <div className="relative aspect-[2/3] overflow-hidden rounded-[11px] bg-white/[0.05] shadow-[0_4px_14px_rgba(0,0,0,0.5)] transition-shadow duration-200 group-hover:shadow-[0_8px_28px_rgba(239,180,63,0.12),0_8px_20px_rgba(0,0,0,0.65)]">
                              {credit.poster_path
                                ? <img src={`${POSTER_BASE}${credit.poster_path}`} alt={credit.title || credit.name}
                                    loading="lazy" className="h-full w-full object-cover" />
                                : <div className="flex h-full w-full items-center justify-center bg-white/[0.03]"><Film size={20} className="text-white/10" /></div>}

                              {(credit.vote_average ?? 0) > 0 && (
                                <div className="absolute left-1.5 top-1.5 flex items-center gap-[3px] rounded-[4px] bg-[#f5c518] px-1.5 py-[2.5px] shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
                                  <Star size={6} className="fill-black text-black shrink-0" />
                                  <span className="text-[8.5px] font-black text-black leading-none">{credit.vote_average!.toFixed(1)}</span>
                                </div>
                              )}

                              {isUpcoming && (
                                <div className="absolute right-1.5 top-1.5 rounded-[4px] border border-emerald-500/30 bg-emerald-500/16 px-1.5 py-[2.5px]">
                                  <span className="text-[7.5px] font-bold text-emerald-400 uppercase leading-none tracking-wide">Soon</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-[7px] px-0.5">
                              <p className="truncate text-[11.5px] font-semibold leading-snug text-white/82">{credit.title || credit.name}</p>
                              <p className="mt-[2px] text-[10px] text-white/28">{dateStr.slice(0, 4) || "—"}</p>
                              {roleLabel && (
                                <p className="mt-[1px] truncate text-[10px] italic text-white/20">{roleLabel}</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
