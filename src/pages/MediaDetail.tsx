import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Film, ArrowLeft, Star, Calendar, Clock, Globe } from "lucide-react";
import { fetchEnrichedMedia, type EnrichedMedia } from "../services/mediaEnrichment";
import { POSTER_BASE, BACKDROP_BASE } from "../config";
import type { MediaType } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Genre = { id: number; name: string };

type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type DetailData = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres: Genre[];
  tagline?: string;
  status?: string;
  original_language?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  production_companies?: Array<{ name: string; logo_path: string | null }>;
  credits?: { cast: CastMember[] };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatYear(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return dateStr.slice(0, 4);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-[11px]">
      <span className="text-[12px] text-white/30 shrink-0">{label}</span>
      <span className="text-[12px] font-medium text-white/55 text-right leading-snug">{children}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaDetail({ mediaType }: { mediaType: MediaType }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [enriched, setEnriched] = useState<EnrichedMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "cast" | "episodes" | "similar" | "notes">("overview");
  const tabsRef = useRef<HTMLDivElement | null>(null);

  /**
   * Watch Now handler — Phase 1b:
   *   - Movie: proceeds to play/open servers
   *   - Series/TV: intercepts and routes to the Episodes tab instead
   */
  const handleWatchNow = () => {
    if (mediaType === "tv") {
      setActiveTab("episodes");
      // Defer scroll until after re-render paints the tab panel
      requestAnimationFrame(() => {
        tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    // TODO(Phase 3): wire to player / server picker (e.g., onOpenWatch)
    // For now, navigate to the existing watch route shape used elsewhere in the app.
    navigate(`/watch/movie/${id}`);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setData(null);
    setEnriched(null);
    setActiveTab("overview");

    fetchEnrichedMedia(mediaType, id)
      .then((e) => {
        setEnriched(e);
        // Project EnrichedMedia onto the existing DetailData view-model so the
        // current UI keeps rendering while we read new fields from `enriched`.
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
          original_language: (e._tmdb as { original_language?: string })?.original_language,
          number_of_seasons: e.numberOfSeasons ?? undefined,
          number_of_episodes: e.numberOfEpisodes ?? undefined,
          production_companies: (e._tmdb as { production_companies?: Array<{ name: string; logo_path: string | null }> })?.production_companies,
          credits: { cast: e.cast },
        });
      })
      .catch(() => setError("Could not load details. Please try again."))
      .finally(() => setLoading(false));
  }, [id, mediaType]);

  const title = data?.title || data?.name || "Unknown";
  const releaseDate = data?.release_date || data?.first_air_date;
  const runtime = data?.runtime ?? data?.episode_run_time?.[0];
  const posterUrl = data?.poster_path ? `${POSTER_BASE}${data.poster_path}` : null;
  const backdropUrl = data?.backdrop_path ? `${BACKDROP_BASE}${data.backdrop_path}` : null;
  const rating = data ? Math.round(data.vote_average * 10) / 10 : null;
  const cast = data?.credits?.cast?.slice(0, 15) ?? [];
  const studio = data?.production_companies?.[0]?.name;

  return (
    <div className="min-h-screen bg-[#07080d] text-white">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-40 w-full bg-[#07080d]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4 md:px-10 lg:px-14">
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 opacity-90 hover:opacity-100 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8a020]">
              <Film size={14} className="text-black" />
            </div>
            <span className="text-[16px] font-black tracking-[-0.04em] text-white">GoodFilm</span>
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:bg-white/[0.14] hover:text-white"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#e8a020]" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center px-6">
          <p className="text-[15px] text-white/50">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-[#e8a020] px-5 py-2 text-sm font-bold text-black"
          >
            Go back
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {data && !loading && (
        <>
          {/* ── Backdrop hero ── */}
          <div className="relative h-[45vh] md:h-[55vh] overflow-hidden">
            {backdropUrl ? (
              <img
                src={backdropUrl}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2e] to-[#07080d]" />
            )}
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/80 via-transparent to-transparent" />
          </div>

          {/* ── Poster + Info (overlaps backdrop) ── */}
          <div className="relative -mt-28 md:-mt-36 px-4 md:px-10 lg:px-14 pb-6">
            <div className="flex flex-col md:flex-row items-end md:items-center gap-7 md:gap-10">

              {/* Poster */}
              <div className="shrink-0 self-start md:self-auto">
                <div
                  className="overflow-hidden rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.75)] ring-1 ring-white/10"
                  style={{ width: "clamp(130px, 13vw, 192px)" }}
                >
                  {posterUrl ? (
                    <img src={posterUrl} alt={title} className="w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center bg-white/5">
                      <Film size={40} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0 flex flex-col gap-3.5">

                {/* Genre tags */}
                {data.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.genres.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-[4px] border border-white/[0.12] bg-white/[0.04] px-2.5 py-[5px] text-[10px] font-semibold uppercase tracking-[0.09em] text-white/45"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title + Year */}
                <div>
                  <h1 className="text-[28px] md:text-[38px] lg:text-[46px] font-black tracking-[-0.04em] text-white leading-[0.95]">
                    {title}
                    {releaseDate && (
                      <span className="text-[20px] md:text-[26px] lg:text-[32px] font-bold text-white/25 ml-2.5 tracking-[-0.02em]">
                        ({formatYear(releaseDate)})
                      </span>
                    )}
                  </h1>
                  {data.tagline && (
                    <p className="mt-1.5 text-[13px] italic text-white/35">{data.tagline}</p>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-white/50">

                  {/* IMDb pill */}
                  {rating !== null && rating > 0 && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#e8a020]/[0.22] px-2 py-[5px]"
                      style={{ background: "rgba(239,180,63,0.10)" }}
                    >
                      <span
                        className="rounded-[3px] px-[5px] py-px text-[11px] font-black tracking-[0.04em] leading-none text-[#07080d]"
                        style={{ background: "#e8a020" }}
                      >
                        IMDb
                      </span>
                      <span className="text-[13px] font-bold text-[#e8a020] leading-none">{rating}</span>
                      <span className="text-[11px] text-[#e8a020]/45 leading-none">
                        / 10{data.vote_count > 0 ? ` (${data.vote_count.toLocaleString()})` : ""}
                      </span>
                    </span>
                  )}

                  {releaseDate && (
                    <>
                      <span className="text-white/20 hidden sm:inline">·</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-white/30" />
                        {formatDate(releaseDate)}
                      </span>
                    </>
                  )}

                  {runtime && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-white/30" />
                        {formatRuntime(runtime)}
                      </span>
                    </>
                  )}

                  {data.original_language && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="flex items-center gap-1.5">
                        <Globe size={12} className="text-white/30" />
                        {data.original_language.toUpperCase()}
                      </span>
                    </>
                  )}

                  {mediaType === "tv" && data.number_of_seasons && (
                    <>
                      <span className="text-white/20">·</span>
                      <span>
                        {data.number_of_seasons} Season{data.number_of_seasons !== 1 ? "s" : ""}
                        {data.number_of_episodes ? ` · ${data.number_of_episodes} Eps` : ""}
                      </span>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {/* Watch Now — film-frame play icon */}
                  <button
                    onClick={handleWatchNow}
                    aria-label={mediaType === "tv" ? "Go to Episodes" : "Watch Now"}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-[#e8a020] px-4 py-[10px] text-[13px] font-bold text-[#07080d] transition hover:bg-[#f7c048] active:scale-[0.98]"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <rect x="1.5" y="2.5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.25"/>
                      <rect x="1.5" y="4" width="1.5" height="1.5" rx="0.3" fill="currentColor"/>
                      <rect x="1.5" y="7.5" width="1.5" height="1.5" rx="0.3" fill="currentColor"/>
                      <rect x="10" y="4" width="1.5" height="1.5" rx="0.3" fill="currentColor"/>
                      <rect x="10" y="7.5" width="1.5" height="1.5" rx="0.3" fill="currentColor"/>
                      <path d="M5 4.5L9.5 6.5L5 8.5Z" fill="currentColor"/>
                    </svg>
                    Watch Now
                  </button>

                  {/* Trailer — clapperboard icon */}
                  <button className="inline-flex items-center gap-2 rounded-[8px] border border-white/[0.11] bg-white/[0.04] px-3.5 py-[10px] text-[13px] font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
                      <rect x="1.5" y="5.5" width="10" height="6" rx="1"/>
                      <rect x="1.5" y="2.5" width="10" height="3" rx="1"/>
                      <line x1="4.5" y1="2.5" x2="3" y2="5.5"/>
                      <line x1="7.5" y1="2.5" x2="6" y2="5.5"/>
                      <line x1="10.5" y1="2.5" x2="9" y2="5.5"/>
                    </svg>
                    Trailer
                  </button>

                  {/* Watchlist — filmstrip + plus icon */}
                  <button className="inline-flex items-center gap-2 rounded-[8px] border border-white/[0.11] bg-white/[0.04] px-3.5 py-[10px] text-[13px] font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <rect x="1" y="3.5" width="7.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.25"/>
                      <rect x="1" y="5" width="1.25" height="1.25" rx="0.25" fill="currentColor"/>
                      <rect x="1" y="7.25" width="1.25" height="1.25" rx="0.25" fill="currentColor"/>
                      <rect x="7.25" y="5" width="1.25" height="1.25" rx="0.25" fill="currentColor"/>
                      <rect x="7.25" y="7.25" width="1.25" height="1.25" rx="0.25" fill="currentColor"/>
                      <line x1="10.5" y1="5.5" x2="10.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="8.5" y1="7.5" x2="12.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Watchlist
                  </button>

                  {/* Watched? — eye with lens iris icon */}
                  <button className="inline-flex items-center gap-2 rounded-[8px] border border-white/[0.11] bg-white/[0.04] px-3.5 py-[10px] text-[13px] font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 6.5C1 6.5 3.5 2.5 6.5 2.5S12 6.5 12 6.5 9.5 10.5 6.5 10.5 1 6.5 1 6.5Z"/>
                      <circle cx="6.5" cy="6.5" r="1.75"/>
                      <circle cx="6.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                    </svg>
                    Watched?
                  </button>

                  {/* Rating — 6-blade camera aperture icon */}
                  <button className="inline-flex items-center gap-1.5 rounded-[8px] border border-white/[0.11] bg-white/[0.04] px-3 py-[10px] text-[12px] font-medium text-white/35 transition hover:border-[#e8a020]/40 hover:text-[#e8a020]">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
                      <circle cx="6.5" cy="6.5" r="5"/>
                      <line x1="6.5" y1="1.5" x2="6.5" y2="3.5"/>
                      <line x1="10.83" y1="4" x2="9.13" y2="5"/>
                      <line x1="10.83" y1="9" x2="9.13" y2="8"/>
                      <line x1="6.5" y1="11.5" x2="6.5" y2="9.5"/>
                      <line x1="2.17" y1="9" x2="3.87" y2="8"/>
                      <line x1="2.17" y1="4" x2="3.87" y2="5"/>
                      <circle cx="6.5" cy="6.5" r="1.5"/>
                    </svg>
                    0.0 / 5
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-white/[0.06] mx-4 md:mx-10 lg:mx-14 mt-2" />

          {/* ── Two-column content: Tabs+Synopsis / Details card ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-10 px-4 md:px-10 lg:px-14 py-8">

            {/* Left: Tabs + Overview */}
            <div ref={tabsRef} style={{ scrollMarginTop: 80 }}>
              {/* Tab bar */}
              <div className="flex border-b border-white/[0.06] mb-7">
                {(
                  [
                    "overview",
                    ...(mediaType === "tv" ? (["episodes"] as const) : []),
                    "cast",
                    "similar",
                    "notes",
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={[
                      "mr-5 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] border-b-2 -mb-px transition-colors",
                      activeTab === tab
                        ? "border-[#e8a020] text-white"
                        : "border-transparent text-white/28 hover:text-white/55",
                    ].join(" ")}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "overview" && (
                <div className="max-w-[640px] space-y-5">
                  {enriched?.tagline && (
                    <p className="text-[14px] italic text-[#e8a020]/85">
                      “{enriched.tagline}”
                    </p>
                  )}
                  <p className="text-[15px] leading-[1.78] text-white/60 whitespace-pre-line">
                    {enriched?.richPlot || data.overview || "No overview available."}
                  </p>
                  {(enriched?.director || enriched?.creators.length || enriched?.writers.length) ? (
                    <div className="pt-2 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[12px]">
                      {enriched?.director && (
                        <>
                          <span className="text-white/30 uppercase tracking-[0.08em]">Director</span>
                          <span className="text-white/70">{enriched.director}</span>
                        </>
                      )}
                      {enriched?.creators.length ? (
                        <>
                          <span className="text-white/30 uppercase tracking-[0.08em]">Created by</span>
                          <span className="text-white/70">{enriched.creators.join(", ")}</span>
                        </>
                      ) : null}
                      {enriched?.writers.length ? (
                        <>
                          <span className="text-white/30 uppercase tracking-[0.08em]">Writers</span>
                          <span className="text-white/70">{enriched.writers.join(", ")}</span>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {enriched?.keywords.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {enriched.keywords.slice(0, 10).map((k) => (
                        <span
                          key={k.id}
                          className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-[5px] text-[10px] font-medium text-white/50"
                        >
                          {k.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {activeTab === "cast" && (
                enriched?.topCast.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-6 max-w-[640px]">
                    {enriched.topCast.map((m) => (
                      <div key={m.id} className="flex gap-3 items-center">
                        <div className="w-[46px] h-[46px] shrink-0 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.04]">
                          {m.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w185${m.profile_path}`}
                              alt={m.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/25">
                              {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-white/80 truncate">{m.name}</p>
                          <p className="text-[11px] text-white/35 italic truncate">{m.character || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-white/25 italic">Cast information unavailable.</p>
                )
              )}
              {activeTab === "episodes" && mediaType === "tv" && (
                <div className="space-y-3">
                  <div className="text-[13px] text-white/45">
                    {data.number_of_seasons
                      ? `${data.number_of_seasons} Season${data.number_of_seasons !== 1 ? "s" : ""}`
                      : "Seasons"}
                    {data.number_of_episodes ? ` · ${data.number_of_episodes} Episodes` : ""}
                  </div>
                  <p className="text-[13px] text-white/25 italic">
                    Episode list loader pending wiring to tmdb service.
                  </p>
                </div>
              )}
              {activeTab === "similar" && (
                <p className="text-[13px] text-white/25 italic">Similar titles coming soon.</p>
              )}
              {activeTab === "notes" && (
                <p className="text-[13px] text-white/25 italic">No notes yet.</p>
              )}
            </div>

            {/* Right: Details card */}
            <aside className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5 h-fit">
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-1 pb-3.5 border-b border-white/[0.06]">
                <div className="w-[2.5px] h-[14px] rounded-full bg-[#e8a020] shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/28">
                  Details
                </span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {enriched?.imdbRating != null ? (
                  <DetailRow label="IMDb">
                    <span className="flex items-center justify-end gap-1 text-[#e8a020]">
                      <Star size={10} fill="currentColor" />
                      {enriched.imdbRating.toFixed(1)} / 10
                      {enriched.imdbVotes ? (
                        <span className="text-[#e8a020]/40 font-normal text-[11px]">
                          ({enriched.imdbVotes.toLocaleString()})
                        </span>
                      ) : null}
                    </span>
                  </DetailRow>
                ) : (
                  rating !== null && rating > 0 && (
                    <DetailRow label="TMDb">
                      <span className="flex items-center justify-end gap-1 text-[#e8a020]">
                        <Star size={10} fill="currentColor" />
                        {rating} / 10{" "}
                        <span className="text-[#e8a020]/40 font-normal text-[11px]">
                          ({data.vote_count.toLocaleString()})
                        </span>
                      </span>
                    </DetailRow>
                  )
                )}
                {enriched?.rottenTomatoes && (
                  <DetailRow label="Rotten T.">{enriched.rottenTomatoes}</DetailRow>
                )}
                {enriched?.metacritic && (
                  <DetailRow label="Metacritic">{enriched.metacritic}</DetailRow>
                )}
                {enriched?.awards && (
                  <DetailRow label="Awards">{enriched.awards}</DetailRow>
                )}

                {releaseDate && (
                  <DetailRow label="Year">{formatYear(releaseDate)}</DetailRow>
                )}

                {data.genres.length > 0 && (
                  <DetailRow label="Genres">
                    {data.genres.map((g) => g.name).join(", ")}
                  </DetailRow>
                )}

                {data.original_language && (
                  <DetailRow label="Language">
                    {data.original_language.toUpperCase()}
                  </DetailRow>
                )}

                {studio && (
                  <DetailRow label="Studio">{studio}</DetailRow>
                )}

                {releaseDate && (
                  <DetailRow label="Release">{releaseDate}</DetailRow>
                )}

                {data.status && (
                  <DetailRow label="Status">
                    <span
                      className={
                        data.status === "Released" || data.status === "Ended"
                          ? "text-emerald-400 font-semibold"
                          : "text-white/55"
                      }
                    >
                      {data.status}
                    </span>
                  </DetailRow>
                )}
              </div>
            </aside>
          </div>

          {/* ── Cast section ── */}
          {cast.length > 0 && (
            <div className="px-4 md:px-10 lg:px-14 pb-16">
              <div className="border-t border-white/[0.06] mb-6" />
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/28 mb-5">Cast</p>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {cast.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col items-center gap-2 text-center shrink-0 w-[68px]"
                  >
                    <div className="w-[56px] h-[56px] rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.05] shrink-0 transition-[border-color] hover:border-[#e8a020]/35">
                      {member.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white/20">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-white/55 leading-snug">{member.name}</p>
                      <p className="text-[10px] text-white/25 italic leading-snug mt-0.5">{member.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-4 md:px-10 lg:px-14 py-8 text-center text-[12px] text-white/25">
        Data provided by{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/50 transition-colors"
        >
          TMDB
        </a>
      </footer>
    </div>
  );
}
