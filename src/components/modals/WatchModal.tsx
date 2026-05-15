/**
 * GoodFilm — Watch Modal (Phase 3, flixer-style chrome pass)
 *
 * Chrome inspired by flixer.su's player shell:
 *   - Full-bleed black canvas (no rounded card, no title rail above the player)
 *   - Minimal top-left close control: single round 48px icon button
 *   - Bottom overlay uses a gradient fade (from-black/85 via-black/40 to-transparent)
 *     with a centered title block and icon-only round controls on the right
 *   - Server picker lives in a right-side slide-in drawer (flixer's "episodes"
 *     pattern): list of servers with a number pill, label, optional tag, and a
 *     live "PLAYING" equalizer for the active row
 *   - Ambient gold glow + shimmer loading state preserved from earlier pass
 *
 * Playback controls (play/pause, seek, volume, PiP, subtitles, fullscreen) are
 * provided by the 3rd-party iframe and not replicated here — we only own the
 * chrome around the canvas.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  LayoutGrid,
  ListVideo,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";
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

// Tagging for "quality hints" shown on each server row.
const SERVER_META: Partial<Record<ServerKey, { tag?: string }>> = {
  "111movies": { tag: "HD · Fast" },
  videasy: { tag: "HD" },
  streamvault: { tag: "HD" },
  superembed: { tag: "HD · Multi-Lang" },
  embedmaster: { tag: "HD" },
  embedsu: { tag: "Backup" },
  autoembed: { tag: "Backup" },
  vidking: { tag: "4K · HD" },
  vidlinkpro: { tag: "HD" },
  vidfastpro: { tag: "Fast" },
  vidsrcicu: { tag: "Backup" },
  vidsrcxyz: { tag: "Backup" },
  twoembed: { tag: "Backup" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Round icon button — flixer-style 48px rounded-full control
// ═══════════════════════════════════════════════════════════════════════════════
function RoundCtrl({
  children,
  label,
  onClick,
  active,
  size = "md",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200",
        size === "lg" ? "h-12 w-12 sm:h-[52px] sm:w-[52px]" : "h-10 w-10 sm:h-11 sm:w-11",
        active
          ? "bg-[#e8a020] text-black shadow-[0_0_20px_rgba(232,160,32,0.5)]"
          : "text-white/80 hover:bg-white/15 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main modal
// ═══════════════════════════════════════════════════════════════════════════════
export function WatchModal({
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
  const [reportOpen, setReportOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [serverDrawerOpen, setServerDrawerOpen] = useState(false);
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);

  // Local season/episode (allows in-player switching without closing modal)
  const [localSeason, setLocalSeason] = useState<number | undefined>(payload?.season);
  const [localEpisode, setLocalEpisode] = useState<number | undefined>(payload?.episode);
  useEffect(() => {
    setLocalSeason(payload?.season);
    setLocalEpisode(payload?.episode);
  }, [payload?.season, payload?.episode, payload?.tmdbId]);

  // Episode drawer data
  const [totalSeasons, setTotalSeasons] = useState<number>(0);
  const [drawerSeason, setDrawerSeason] = useState<number>(payload?.season ?? 1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Array<{
    episode_number: number;
    name: string;
    overview?: string;
    still_path?: string | null;
    runtime?: number | null;
    air_date?: string;
  }>>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Keep drawerSeason in sync with payload on first open
  useEffect(() => {
    setDrawerSeason(payload?.season ?? 1);
  }, [payload?.tmdbId, payload?.season]);

  // Fetch total season count when modal opens for a TV show
  useEffect(() => {
    if (!open || payload?.mediaType !== "tv" || !payload?.tmdbId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await tmdbFetch<{
          number_of_seasons?: number;
          seasons?: Array<{ season_number: number }>;
        }>(`/tv/${payload.tmdbId}`, {});
        if (!cancelled) {
          const realSeasons = (data.seasons ?? []).filter(s => s.season_number > 0);
          setTotalSeasons(realSeasons.length > 0 ? realSeasons.length : (data.number_of_seasons ?? 0));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, payload?.tmdbId, payload?.mediaType]);

  // Fetch episodes when drawer opens / season changes
  useEffect(() => {
    if (!episodeDrawerOpen || payload?.mediaType !== "tv" || !payload?.tmdbId) return;
    let cancelled = false;
    setEpisodesLoading(true);
    (async () => {
      try {
        const data = await tmdbFetch<{ episodes?: typeof seasonEpisodes }>(
          `/tv/${payload.tmdbId}/season/${drawerSeason}`,
          {}
        );
        if (!cancelled) setSeasonEpisodes(data.episodes ?? []);
      } catch {
        if (!cancelled) setSeasonEpisodes([]);
      } finally {
        if (!cancelled) setEpisodesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [episodeDrawerOpen, drawerSeason, payload?.tmdbId, payload?.mediaType]);

  const { primary, backup } = useMemo(() => {
    const primaryKeys = new Set<ServerKey>([
      "111movies",
      "videasy",
      "streamvault",
      "vidking",
      "vidlinkpro",
      "vidfastpro",
    ]);
    return {
      primary: SERVERS.filter((s) => primaryKeys.has(s.key)),
      backup: SERVERS.filter((s) => !primaryKeys.has(s.key)),
    };
  }, []);

  const buildUrlFor = useCallback(
    (serverKey: ServerKey) => {
      if (!payload?.tmdbId) return "";
      const server = SERVERS.find((s) => s.key === serverKey) ?? SERVERS[0];
      return server.buildUrl({
        type: payload.mediaType,
        tmdbId: payload.tmdbId,
        season: localSeason,
        episode: localEpisode,
      });
    },
    [payload, localSeason, localEpisode]
  );

  const handleEpisodeSelect = useCallback((season: number, episode: number) => {
    setLocalSeason(season);
    setLocalEpisode(episode);
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
    setEpisodeDrawerOpen(false);
  }, []);

  const currentUrl = buildUrlFor(selectedServer);

  const handleServerSwitch = useCallback((serverKey: ServerKey) => {
    setSelectedServer(serverKey);
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
    setReportOpen(false);
  }, []);

  const reloadIframe = useCallback(() => {
    setIframeKey((k) => k + 1);
    setIframeLoading(true);
  }, []);

  const openInNewTab = useCallback(() => {
    if (currentUrl) {
      Object.assign(document.createElement("a"), {
        href: currentUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      }).click();
    }
  }, [currentUrl]);

  // Detect iOS — requestFullscreen is unsupported on iOS Safari.
  // The modal is already fixed inset-0 (effectively fullscreen), so on iOS we
  // simply skip the Fullscreen API call to avoid the silent no-op.
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);

  // Fullscreen toggle (operates on the modal container so chrome remains visible)
  const toggleFullscreen = useCallback(() => {
    if (isIOS) return; // iOS handles video fullscreen natively inside the iframe
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [isIOS]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Reset + keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    setSelectedServer("111movies");
    setIframeKey((k) => k + 1);
    setReportOpen(false);
    setServerDrawerOpen(false);
    setEpisodeDrawerOpen(false);

    const allServers = [...primary, ...backup];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key.toLowerCase() === "e" && !e.metaKey && !e.ctrlKey && payload?.mediaType === "tv") {
        e.preventDefault();
        setEpisodeDrawerOpen((v) => !v);
        return;
      }
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        reloadIframe();
        return;
      }
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setServerDrawerOpen((v) => !v);
        return;
      }
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      const numeric = parseInt(e.key, 10);
      if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= allServers.length) {
        handleServerSwitch(allServers[numeric - 1].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, handleServerSwitch, reloadIframe, toggleFullscreen, primary, backup, payload?.mediaType]);

  // Auto-hide chrome on idle — always visible when drawers/report open or loading
  const forceVisible =
    iframeLoading || serverDrawerOpen || episodeDrawerOpen || reportOpen;

  useEffect(() => {
    if (!open) return;
    const ping = () => {
      setChromeVisible(true);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setChromeVisible(false);
      }, 3000);
    };
    ping();
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, ping));
    return () => {
      events.forEach((e) => window.removeEventListener(e, ping));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [open]);

  const showChrome = forceVisible || chromeVisible;

  if (!open || !payload?.tmdbId) return null;

  const episodeLabel =
    payload.mediaType === "tv" && localSeason && localEpisode
      ? `S${localSeason} · Episode ${localEpisode}`
      : null;

  const allServers = [...primary, ...backup];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black"
        onClick={onClose}
      >
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative h-full w-full overflow-hidden bg-black group"
        >
          {/* ════ Iframe canvas (full-bleed) ════ */}
          <div className="absolute inset-0 bg-black">
            {/* Ambient top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-40 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(232,160,32,0.14),transparent_70%)]" />

            {/* Loading shimmer */}
            <AnimatePresence>
              {iframeLoading && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 z-[15] flex items-center justify-center bg-[linear-gradient(110deg,rgba(8,6,4,1)_30%,rgba(232,160,32,0.06)_50%,rgba(8,6,4,1)_70%)] bg-[length:200%_100%] animate-[shimmer_1.8s_linear_infinite]"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-end gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.span
                          key={i}
                          className="w-[3px] rounded-full bg-[#e8a020]"
                          animate={{ height: ["8px", "22px", "8px"] }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            delay: i * 0.12,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Loading stream
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={currentUrl}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share"
              className="absolute inset-0 z-10 h-full w-full border-0"
              title={payload.title}
              referrerPolicy="no-referrer"
              onLoad={() => setIframeLoading(false)}
              // playsinline: forwarded hint for iOS WebKit — allows inline playback
              // inside the embed rather than forcing native fullscreen takeover.
              {...{ playsinline: "true", "webkit-playsinline": "true" }}
            />

            {/* Inner cinematic vignette */}
            <div className="pointer-events-none absolute inset-0 z-[20] shadow-[inset_0_0_0_1px_rgba(232,160,32,0.07),inset_0_0_120px_rgba(0,0,0,0.55)]" />
          </div>

          {/* ════ Top chrome — full control bar (close · title · controls) ════ */}
          <motion.div
            animate={{ opacity: showChrome ? 1 : 0, y: showChrome ? 0 : -20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ pointerEvents: showChrome ? "auto" : "none" }}
            className="absolute inset-x-0 top-0 z-[60]"
          >
            <div className="bg-gradient-to-b from-black/90 via-black/55 to-transparent pt-3 pb-16 sm:pt-4">
              <div className="flex items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
                {/* Left: close + reload */}
                <div className="flex items-center gap-1">
                  <RoundCtrl label="Close player (Esc)" onClick={onClose} size="lg">
                    <X size={20} />
                  </RoundCtrl>
                  <RoundCtrl label="Reload stream (R)" onClick={reloadIframe} size="lg">
                    <RefreshCw size={18} />
                  </RoundCtrl>
                </div>

                {/* Center: title + episode label + live server pill */}
                <div className="min-w-0 flex-1 text-center">
                  {episodeLabel && (
                    <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#e8a020]/80">
                      {episodeLabel}
                    </div>
                  )}
                  <div className="truncate text-[14px] font-bold text-white sm:text-[16px]">
                    {payload.title}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 backdrop-blur-md">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8a020] opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e8a020]" />
                    </span>
                    <span>
                      {SERVERS.find((s) => s.key === selectedServer)?.label.replace(/ — Default$/, "") ?? ""}
                    </span>
                  </div>
                </div>

                {/* Right: open · report · episodes (TV) · servers · fullscreen */}
                <div className="flex items-center gap-1">
                  <RoundCtrl label="Open in new tab" onClick={openInNewTab} size="lg">
                    <ExternalLink size={18} />
                  </RoundCtrl>
                  <RoundCtrl
                    label="Report broken"
                    onClick={() => setReportOpen((v) => !v)}
                    size="lg"
                    active={reportOpen}
                  >
                    <Flag size={18} />
                  </RoundCtrl>
                  {payload.mediaType === "tv" && (
                    <RoundCtrl
                      label="Episodes (E)"
                      onClick={() => setEpisodeDrawerOpen((v) => !v)}
                      size="lg"
                      active={episodeDrawerOpen}
                    >
                      <ListVideo size={18} />
                    </RoundCtrl>
                  )}
                  <RoundCtrl
                    label="Servers (S)"
                    onClick={() => setServerDrawerOpen((v) => !v)}
                    size="lg"
                    active={serverDrawerOpen}
                  >
                    <LayoutGrid size={18} />
                  </RoundCtrl>
                  {/* Fullscreen button — hidden on iOS where the Fullscreen API is unsupported */}
                  {!isIOS && (
                    <RoundCtrl
                      label={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
                      onClick={toggleFullscreen}
                      size="lg"
                      active={isFullscreen}
                    >
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </RoundCtrl>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ════ Report banner ════ */}
          <AnimatePresence>
            {reportOpen && (
              <motion.div
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-x-0 top-20 z-[58] mx-auto max-w-xl px-4"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-[#e8a020]/30 bg-black/80 px-4 py-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                  <AlertTriangle size={15} className="shrink-0 text-[#e8a020]" />
                  <p className="text-[12px] text-white/75">
                    Having trouble? Try another server, reload with{" "}
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">R</kbd>,
                    or{" "}
                    <button onClick={openInNewTab} className="underline hover:text-[#e8a020]">
                      open in a new tab
                    </button>
                    .
                  </p>
                  <button
                    onClick={() => setReportOpen(false)}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════ Servers side drawer ════ */}
          <AnimatePresence>
            {serverDrawerOpen && (
              <>
                {/* Dim overlay behind drawer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[70] bg-black/40"
                  onClick={() => setServerDrawerOpen(false)}
                />
                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-0 z-[72] flex h-full w-[min(440px,92vw)] flex-col border-l border-white/[0.08] bg-[#07080d]/95 backdrop-blur-xl shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e8a020]/80">
                        Server
                      </div>
                      <div className="mt-0.5 text-[15px] font-black tracking-tight text-white">
                        {allServers.length} available
                      </div>
                    </div>
                    <button
                      onClick={() => setServerDrawerOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close servers"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 py-3">
                    <ServerList
                      title="Primary"
                      subtitle="Best quality & speed"
                      servers={primary}
                      startIndex={1}
                      selected={selectedServer}
                      onSelect={(k) => {
                        handleServerSwitch(k);
                      }}
                    />
                    {backup.length > 0 && (
                      <div className="mt-5">
                        <ServerList
                          title="Backup"
                          subtitle="If a primary fails or is region-locked"
                          servers={backup}
                          startIndex={primary.length + 1}
                          selected={selectedServer}
                          onSelect={(k) => {
                            handleServerSwitch(k);
                          }}
                          muted
                        />
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-white/[0.06] px-5 py-3">
                    <p className="text-[11px] text-white/40">
                      <kbd className="mr-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                        1–9
                      </kbd>{" "}
                      quick switch ·{" "}
                      <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                        R
                      </kbd>{" "}
                      reload ·{" "}
                      <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                        S
                      </kbd>{" "}
                      servers ·{" "}
                      <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                        F
                      </kbd>{" "}
                      fullscreen ·{" "}
                      <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                        Esc
                      </kbd>{" "}
                      close
                    </p>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* ════ Episodes side drawer (TV only) ════ */}
          <AnimatePresence>
            {episodeDrawerOpen && payload.mediaType === "tv" && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[70] bg-black/40"
                  onClick={() => setEpisodeDrawerOpen(false)}
                />
                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-0 z-[72] flex h-full w-[min(480px,94vw)] flex-col border-l border-white/[0.08] bg-[#07080d]/95 backdrop-blur-xl shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e8a020]/80">
                        Episodes
                      </div>
                      <div className="mt-0.5 text-[15px] font-black tracking-tight text-white">
                        {payload.title}
                      </div>
                    </div>
                    <button
                      onClick={() => setEpisodeDrawerOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close episodes"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Season switcher */}
                  {totalSeasons > 0 && (
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] bg-black/30 px-4 py-2.5">
                      <button
                        onClick={() => setDrawerSeason((s) => Math.max(1, s - 1))}
                        disabled={drawerSeason <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Previous season"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/85">
                        Season {drawerSeason}
                        <span className="ml-2 text-white/35">
                          of {totalSeasons}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setDrawerSeason((s) => Math.min(totalSeasons, s + 1))
                        }
                        disabled={drawerSeason >= totalSeasons}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Next season"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-3 py-3">
                    {episodesLoading ? (
                      <div className="flex items-center justify-center py-16 text-white/40">
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Loading episodes…
                      </div>
                    ) : seasonEpisodes.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-[12px] text-white/45">
                        No episodes found for this season.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {seasonEpisodes.map((ep) => {
                          const active =
                            drawerSeason === localSeason &&
                            ep.episode_number === localEpisode;
                          return (
                            <motion.button
                              key={ep.episode_number}
                              onClick={() =>
                                handleEpisodeSelect(drawerSeason, ep.episode_number)
                              }
                              whileHover={{ x: 2 }}
                              whileTap={{ scale: 0.99 }}
                              className={cn(
                                "group relative flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-all",
                                active
                                  ? "border-[#e8a020]/45 bg-[#e8a020]/10"
                                  : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.05]"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-black transition",
                                  active
                                    ? "bg-[#e8a020] text-black"
                                    : "bg-white/[0.05] text-white/55 group-hover:bg-white/[0.10] group-hover:text-white/85"
                                )}
                              >
                                {ep.episode_number}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "truncate text-[13px] font-bold tracking-tight",
                                      active ? "text-white" : "text-white/90 group-hover:text-white"
                                    )}
                                  >
                                    {ep.name || `Episode ${ep.episode_number}`}
                                  </div>
                                  {active && (
                                    <motion.span
                                      layoutId="episode-active-playing"
                                      className="flex items-center gap-1.5 rounded-full bg-[#e8a020]/15 px-2 py-0.5"
                                    >
                                      <span className="flex items-end gap-[2px]">
                                        {[0, 1, 2].map((j) => (
                                          <motion.span
                                            key={j}
                                            className="w-[2px] rounded-full bg-[#e8a020]"
                                            animate={{ height: ["3px", "9px", "3px"] }}
                                            transition={{
                                              duration: 0.8,
                                              repeat: Infinity,
                                              delay: j * 0.14,
                                              ease: "easeInOut",
                                            }}
                                          />
                                        ))}
                                      </span>
                                      <span className="text-[8.5px] font-black uppercase tracking-[0.16em] text-[#e8a020]">
                                        Playing
                                      </span>
                                    </motion.span>
                                  )}
                                </div>
                                {ep.overview && (
                                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/50">
                                    {ep.overview}
                                  </div>
                                )}
                                {(ep.air_date || ep.runtime) && (
                                  <div className="mt-1 flex items-center gap-2 text-[10px] text-white/30">
                                    {ep.air_date && <span>{ep.air_date}</span>}
                                    {ep.runtime && <span>· {ep.runtime} min</span>}
                                  </div>
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Server list row (flixer "episodes"-style row)
// ═══════════════════════════════════════════════════════════════════════════════
function ServerList({
  title,
  subtitle,
  servers,
  startIndex,
  selected,
  onSelect,
  muted,
}: {
  title: string;
  subtitle: string;
  servers: typeof SERVERS;
  startIndex: number;
  selected: ServerKey;
  onSelect: (key: ServerKey) => void;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-2">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.18em]",
            muted ? "text-white/30" : "text-[#e8a020]/80"
          )}
        >
          {title}
        </p>
        <span className="text-[10px] text-white/25">{subtitle}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {servers.map((server, i) => {
          const idx = startIndex + i;
          const active = server.key === selected;
          const meta = SERVER_META[server.key];
          return (
            <motion.button
              key={server.key}
              onClick={() => onSelect(server.key)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "group relative flex items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-all",
                active
                  ? "border-[#e8a020]/45 bg-[#e8a020]/10"
                  : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.05]"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-black transition",
                  active
                    ? "bg-[#e8a020] text-black"
                    : "bg-white/[0.05] text-white/45 group-hover:bg-white/[0.10] group-hover:text-white/80"
                )}
              >
                {idx}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate text-[13px] font-bold tracking-tight",
                    active ? "text-white" : "text-white/85 group-hover:text-white"
                  )}
                >
                  {server.label.replace(/ — Default$/, "")}
                </div>
                {meta?.tag && (
                  <div
                    className={cn(
                      "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      active ? "text-[#e8a020]" : "text-white/35"
                    )}
                  >
                    {meta.tag}
                  </div>
                )}
              </div>
              {active && (
                <motion.span
                  layoutId="server-active-playing"
                  className="flex items-center gap-2 rounded-full bg-[#e8a020]/15 px-2.5 py-1"
                >
                  <span className="flex items-end gap-[2px]">
                    {[0, 1, 2].map((j) => (
                      <motion.span
                        key={j}
                        className="w-[2px] rounded-full bg-[#e8a020] shadow-[0_0_6px_rgba(232,160,32,0.9)]"
                        animate={{ height: ["4px", "11px", "4px"] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: j * 0.14,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[#e8a020]">
                    Playing
                  </span>
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
