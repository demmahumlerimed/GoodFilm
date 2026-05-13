/**
 * GoodFilm — Mobile Watch Page
 *
 * Page-based (not overlay) player for phone screens.
 * Root cause for iOS iframe issues: fixed+overflow:hidden ancestors block
 * cross-origin iframe touch events in WebKit. This component uses a
 * scrollable fixed container so the iframe sits in normal flow.
 *
 * Layout (top → bottom, all inline — no drawers):
 *   • Sticky header: back · title · reload
 *   • 16:9 player iframe
 *   • Source picker (horizontal scroll)
 *   • TV: season tabs + episode list
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Play } from "lucide-react";
import { cn } from "../../utils/cn";
import { SERVERS, type ServerKey } from "../../constants/servers";
import { tmdbFetch } from "../../services/tmdb";
import type { MediaType } from "../../types";

type WatchPayload = {
  url: string;
  title: string;
  mediaType: MediaType;
  tmdbId?: number;
  season?: number;
  episode?: number;
};

type EpisodeRow = {
  episode_number: number;
  name: string;
  overview?: string | null;
  runtime?: number | null;
  air_date?: string | null;
  still_path?: string | null;
};

const SERVER_TAG: Partial<Record<ServerKey, string>> = {
  "111movies": "Fast",
  videasy:     "HD",
  filmu:       "Alt",
  superembed:  "HD",
  embedmaster: "HD",
  embedsu:     "Backup",
  autoembed:   "Backup",
  vidking:     "4K",
  vidlinkpro:  "HD",
  vidfastpro:  "Fast",
  vidsrcicu:   "Backup",
  vidsrcxyz:   "Backup",
  twoembed:    "Backup",
};

const SHORT_LABEL: Partial<Record<ServerKey, string>> = {
  "111movies": "111Movies",
  videasy:     "Videasy",
  filmu:       "Filmu",
  superembed:  "SuperEmbed",
  embedmaster: "EmbedMaster",
  embedsu:     "Embed.su",
  autoembed:   "AutoEmbed",
  vidking:     "VidKing",
  vidlinkpro:  "VidLink",
  vidfastpro:  "VidFast",
  vidsrcicu:   "VidSrc ICU",
  vidsrcxyz:   "VidSrc XYZ",
  twoembed:    "2Embed",
};

export function MobileWatchPage({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: WatchPayload | null;
  onClose: () => void;
}) {
  const [selectedServer, setSelectedServer] = useState<ServerKey>("111movies");
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [localSeason, setLocalSeason] = useState(payload?.season ?? 1);
  const [localEpisode, setLocalEpisode] = useState(payload?.episode ?? 1);
  const [totalSeasons, setTotalSeasons] = useState(0);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Reset state when a new title opens
  useEffect(() => {
    if (!payload) return;
    setLocalSeason(payload.season ?? 1);
    setLocalEpisode(payload.episode ?? 1);
    setSelectedServer("111movies");
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
  }, [payload?.tmdbId]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fetch total seasons
  useEffect(() => {
    if (!open || payload?.mediaType !== "tv" || !payload?.tmdbId) return;
    let dead = false;
    tmdbFetch<{ number_of_seasons?: number }>(`/tv/${payload.tmdbId}`, {})
      .then((d) => { if (!dead) setTotalSeasons(d.number_of_seasons ?? 0); })
      .catch(() => {});
    return () => { dead = true; };
  }, [open, payload?.tmdbId, payload?.mediaType]);

  // Fetch episodes for active season
  useEffect(() => {
    if (payload?.mediaType !== "tv" || !payload?.tmdbId) return;
    let dead = false;
    setEpisodesLoading(true);
    tmdbFetch<{ episodes?: EpisodeRow[] }>(`/tv/${payload.tmdbId}/season/${localSeason}`, {})
      .then((d) => { if (!dead) setEpisodes(d.episodes ?? []); })
      .catch(() => { if (!dead) setEpisodes([]); })
      .finally(() => { if (!dead) setEpisodesLoading(false); });
    return () => { dead = true; };
  }, [payload?.tmdbId, payload?.mediaType, localSeason]);

  const currentUrl = useMemo(() => {
    if (!payload?.tmdbId) return "";
    const server = SERVERS.find((s) => s.key === selectedServer) ?? SERVERS[0];
    return server.buildUrl({
      type: payload.mediaType,
      tmdbId: payload.tmdbId,
      season: payload.mediaType === "tv" ? localSeason : undefined,
      episode: payload.mediaType === "tv" ? localEpisode : undefined,
    });
  }, [payload, selectedServer, localSeason, localEpisode]);

  const pickEpisode = useCallback((ep: number) => {
    setLocalEpisode(ep);
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
    // Scroll back to player
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pickSeason = useCallback((s: number) => {
    setLocalSeason(s);
    setLocalEpisode(1);
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
  }, []);

  const pickServer = useCallback((key: ServerKey) => {
    setSelectedServer(key);
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
  }, []);

  const reload = useCallback(() => {
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
  }, []);

  if (!open || !payload?.tmdbId) return null;

  const isTV = payload.mediaType === "tv";
  const currentEp = episodes.find((e) => e.episode_number === localEpisode);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-watch"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 36 }}
          className="fixed inset-0 z-[90] flex flex-col bg-[#07080d]"
          style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div
            className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/[0.06] bg-[#07080d]/96 backdrop-blur-xl"
            style={{
              paddingTop: "max(12px, env(safe-area-inset-top))",
              paddingBottom: "12px",
              paddingLeft: "12px",
              paddingRight: "16px",
            }}
          >
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/60 active:bg-white/10 transition"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold leading-tight text-white">
                {payload.title}
              </p>
              {isTV && (
                <p className="mt-0.5 text-[12px] font-semibold text-[#e8a020]/80">
                  S{localSeason} · E{localEpisode}
                  {currentEp ? ` — ${currentEp.name}` : ""}
                </p>
              )}
            </div>

            <button
              onClick={reload}
              className="shrink-0 rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold text-white/40 active:text-white/80 active:bg-white/[0.06] transition"
            >
              Reload
            </button>
          </div>

          {/* ── Player ──────────────────────────────────────────────────── */}
          {/* position:relative + aspect-ratio keeps iframe in normal flow.
              This is the key fix: no fixed/overflow:hidden ancestor for the
              iframe, which resolves iOS WebKit cross-origin touch blocking. */}
          <div className="relative w-full shrink-0 bg-black" style={{ aspectRatio: "16/9" }}>
            <AnimatePresence>
              {iframeLoading && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-[#07080d]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-[3px]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.span
                          key={i}
                          className="w-[3px] rounded-full bg-[#e8a020]"
                          animate={{ height: ["8px", "22px", "8px"] }}
                          transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-semibold">
                      Loading
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <iframe
              key={iframeKey}
              src={currentUrl}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              className="absolute inset-0 h-full w-full border-0"
              title={payload.title}
              referrerPolicy="no-referrer"
              onLoad={() => setIframeLoading(false)}
              {...({ playsinline: "true", "webkit-playsinline": "true" } as Record<string, string>)}
            />
          </div>

          {/* ── Source picker ───────────────────────────────────────────── */}
          <div className="px-4 pt-5 pb-1">
            <p className="mb-2.5 text-[12px] font-semibold text-white/40 tracking-[-0.01em]">
              Source
            </p>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
            >
              {SERVERS.map((server) => {
                const active = server.key === selectedServer;
                const tag = SERVER_TAG[server.key];
                return (
                  <button
                    key={server.key}
                    onClick={() => pickServer(server.key)}
                    className={cn(
                      "shrink-0 flex flex-col items-start rounded-[12px] border px-3.5 py-2.5 transition",
                      active
                        ? "border-[#e8a020]/40 bg-[#e8a020]/12"
                        : "border-white/[0.08] bg-white/[0.04] active:bg-white/[0.08]"
                    )}
                  >
                    <span className={cn(
                      "text-[13px] font-semibold",
                      active ? "text-[#e8a020]" : "text-white/60"
                    )}>
                      {SHORT_LABEL[server.key] ?? server.label}
                    </span>
                    {tag && (
                      <span className={cn(
                        "mt-0.5 text-[11px] font-bold tracking-wide",
                        active ? "text-[#e8a020]/70" : "text-white/35"
                      )}>
                        {tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Open in browser */}
          <div className="px-4 pt-1 pb-4">
            <button
              onClick={() => Object.assign(document.createElement("a"), { href: currentUrl, target: "_blank", rel: "noopener noreferrer" }).click()}
              className="py-1.5 text-[12px] text-white/30 active:text-white/60 transition"
            >
              Open in browser ↗
            </button>
          </div>

          {/* ── TV: season + episode list ────────────────────────────────── */}
          {isTV && (
            <div className="flex-1 px-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
              {/* Season tabs */}
              {totalSeasons > 1 && (
                <div className="mb-5">
                  <p className="mb-2.5 text-[12px] font-semibold text-white/40 tracking-[-0.01em]">
                    Season
                  </p>
                  <div
                    className="flex gap-2 overflow-x-auto"
                    style={{ scrollbarWidth: "none" } as React.CSSProperties}
                  >
                    {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                      <button
                        key={s}
                        onClick={() => pickSeason(s)}
                        className={cn(
                          "shrink-0 h-11 min-w-[44px] rounded-[8px] px-3 text-[13px] font-bold transition",
                          s === localSeason
                            ? "bg-[#e8a020] text-black"
                            : "bg-white/[0.06] text-white/45 active:bg-white/[0.10]"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Episode rows */}
              <p className="mb-2.5 text-[12px] font-semibold text-white/40 tracking-[-0.01em]">
                Episodes
              </p>

              {episodesLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 rounded-[10px] bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {episodes.map((ep) => {
                    const active = ep.episode_number === localEpisode;
                    return (
                      <button
                        key={ep.episode_number}
                        onClick={() => pickEpisode(ep.episode_number)}
                        className="flex w-full items-center gap-3 py-3.5 text-left transition active:bg-white/[0.03]"
                      >
                        {/* Thumbnail */}
                        <div
                          className="relative shrink-0 overflow-hidden rounded-[9px] bg-white/[0.06]"
                          style={{ width: 88, height: 52 }}
                        >
                          {ep.still_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w185${ep.still_path}`}
                              alt={ep.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className={cn(
                                "text-[13px] font-black",
                                active ? "text-[#e8a020]" : "text-white/30"
                              )}>
                                {ep.episode_number}
                              </span>
                            </div>
                          )}
                          {active && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play size={12} className="fill-white text-white drop-shadow" />
                            </div>
                          )}
                        </div>

                        {/* Title + runtime */}
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-[12px] font-bold tracking-[-0.01em]",
                            active ? "text-[#e8a020]" : "text-white/40"
                          )}>
                            E{ep.episode_number}
                          </p>
                          <p className={cn(
                            "truncate text-[14px] font-semibold leading-snug",
                            active ? "text-white" : "text-white/75"
                          )}>
                            {ep.name}
                          </p>
                          {ep.runtime ? (
                            <p className="mt-0.5 text-[12px] text-white/40">{ep.runtime}m</p>
                          ) : ep.air_date ? (
                            <p className="mt-0.5 text-[12px] text-white/40">
                              {ep.air_date.slice(0, 4)}
                            </p>
                          ) : null}
                        </div>

                        {/* Playing indicator */}
                        {active && (
                          <Play size={11} className="shrink-0 fill-[#e8a020] text-[#e8a020] mr-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
