import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Film, ArrowLeft, Star, Calendar, Clock, Globe } from "lucide-react";
import { tmdbFetch } from "../services/tmdb";
import { POSTER_BASE, BACKDROP_BASE } from "../config";
import type { MediaType } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Genre = { id: number; name: string };

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
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaDetail({ mediaType }: { mediaType: MediaType }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setData(null);

    const path = mediaType === "movie" ? `/movie/${id}` : `/tv/${id}`;
    tmdbFetch<DetailData>(path, { append_to_response: "credits" })
      .then(setData)
      .catch(() => setError("Could not load details. Please try again."))
      .finally(() => setLoading(false));
  }, [id, mediaType]);

  const title = data?.title || data?.name || "Unknown";
  const releaseDate = data?.release_date || data?.first_air_date;
  const runtime = data?.runtime ?? data?.episode_run_time?.[0];
  const posterUrl = data?.poster_path ? `${POSTER_BASE}${data.poster_path}` : null;
  const backdropUrl = data?.backdrop_path ? `${BACKDROP_BASE}${data.backdrop_path}` : null;
  const rating = data ? Math.round(data.vote_average * 10) / 10 : null;

  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-40 w-full bg-[#07080d]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4 md:px-10 lg:px-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 opacity-90 hover:opacity-100 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f]">
              <Film size={14} className="text-black" />
            </div>
            <span className="text-[16px] font-black tracking-[-0.04em] text-white">GoodFilm</span>
          </Link>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:bg-white/14 hover:text-white"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#efb43f]" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center px-6">
          <p className="text-[15px] text-white/50">{error}</p>
          <button onClick={() => navigate(-1)} className="rounded-full bg-[#efb43f] px-5 py-2 text-sm font-bold text-black">
            Go back
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {data && !loading && (
        <>
          {/* Backdrop hero */}
          <div className="relative -mt-0 h-[45vh] md:h-[55vh] overflow-hidden">
            {backdropUrl ? (
              <img
                src={backdropUrl}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2e] to-[#07080d]" />
            )}
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/70 via-transparent to-transparent" />
          </div>

          {/* Main content */}
          <div className="relative -mt-28 md:-mt-40 px-4 md:px-10 lg:px-14 pb-20">
            <div className="flex flex-col md:flex-row gap-8 md:gap-12">

              {/* Poster */}
              <div className="shrink-0 self-start">
                <div className="w-[140px] md:w-[200px] lg:w-[240px] overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
                  {posterUrl ? (
                    <img src={posterUrl} alt={title} className="w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center bg-white/5">
                      <Film size={40} className="text-white/20" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-4 md:pt-8">
                {/* Genres */}
                {data.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {data.genres.map(g => (
                      <span key={g.id} className="rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h1 className="text-[28px] md:text-[40px] lg:text-[48px] font-black tracking-[-0.04em] text-white leading-tight mb-2">
                  {title}
                </h1>

                {/* Tagline */}
                {data.tagline && (
                  <p className="text-[14px] italic text-white/40 mb-4">{data.tagline}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-[13px] text-white/55">
                  {rating !== null && rating > 0 && (
                    <span className="flex items-center gap-1.5 text-[#efb43f] font-bold text-[15px]">
                      <Star size={14} fill="currentColor" />
                      {rating}
                      <span className="text-white/35 font-normal text-[12px]">/ 10</span>
                    </span>
                  )}
                  {releaseDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-white/35" />
                      {formatDate(releaseDate)}
                    </span>
                  )}
                  {runtime && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-white/35" />
                      {formatRuntime(runtime)}
                    </span>
                  )}
                  {data.original_language && (
                    <span className="flex items-center gap-1.5 capitalize">
                      <Globe size={13} className="text-white/35" />
                      {data.original_language.toUpperCase()}
                    </span>
                  )}
                  {mediaType === "tv" && data.number_of_seasons && (
                    <span className="text-white/55">
                      {data.number_of_seasons} Season{data.number_of_seasons !== 1 ? "s" : ""}
                      {data.number_of_episodes ? ` · ${data.number_of_episodes} Episodes` : ""}
                    </span>
                  )}
                </div>

                {/* Overview */}
                {data.overview && (
                  <p className="text-[15px] leading-[1.75] text-white/70 max-w-[700px]">
                    {data.overview}
                  </p>
                )}

                {/* Status chip */}
                {data.status && (
                  <div className="mt-5">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/45">
                      {data.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-4 md:px-10 lg:px-14 py-8 text-center text-[12px] text-white/25">
        Data provided by{" "}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">
          TMDB
        </a>
      </footer>
    </div>
  );
}
