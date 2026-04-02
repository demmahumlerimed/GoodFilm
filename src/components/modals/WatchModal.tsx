import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Maximize2, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { SERVERS, type ServerKey } from "../../constants/servers";
import type { MediaType } from "../../types";

type WatchPayload = {
  url: string;
  title: string;
  mediaType: MediaType;
  tmdbId?: number;
  season?: number;
  episode?: number;
};

export function WatchModal({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: WatchPayload | null;
  onClose: () => void;
}) {
  const [selectedServer, setSelectedServer] = useState<ServerKey>("superembed");
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedServer("superembed");
    setIframeKey((k) => k + 1);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !payload?.tmdbId) return null;

  const buildUrlFor = (serverKey: ServerKey) => {
    const server = SERVERS.find((s) => s.key === serverKey) ?? SERVERS[0];
    return server.buildUrl({
      type: payload.mediaType,
      tmdbId: payload.tmdbId!,
      season: payload.season,
      episode: payload.episode,
    });
  };

  const currentUrl = buildUrlFor(selectedServer);

  const handleServerSwitch = (serverKey: ServerKey) => {
    setSelectedServer(serverKey);
    setIframeKey((k) => k + 1);
  };

  const openInNewTab = () => {
    window.open(currentUrl, "_blank", "noopener,noreferrer");
  };

  const episodeLabel =
    payload.mediaType === "tv" && payload.season && payload.episode
      ? ` · S${payload.season}E${payload.episode}`
      : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl"
          style={{ maxHeight: "92vh" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-bold text-white sm:text-[16px]">
                {payload.title}{episodeLabel}
              </h3>
            </div>
            <div className="ml-3 flex items-center gap-2">
              <button
                onClick={openInNewTab}
                title="Open in new tab"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <ExternalLink size={13} />
              </button>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Iframe player */}
          <div className="relative w-full shrink-0 bg-black" style={{ aspectRatio: "16/9" }}>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={currentUrl}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              className="absolute inset-0 h-full w-full border-0"
              title={payload.title}
            />
            {/* Fullscreen hint overlay — fades on hover */}
            <button
              onClick={openInNewTab}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] text-white/50 opacity-0 transition hover:opacity-100 focus:opacity-100"
              title="Open in new tab for best experience"
            >
              <Maximize2 size={11} />
              <span>Full screen</span>
            </button>
          </div>

          {/* Server picker */}
          <div className="shrink-0 overflow-x-auto border-t border-white/6 px-3 py-2.5 sm:px-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              Switch Server
            </p>
            <div className="flex gap-2">
              {SERVERS.map((server, i) => {
                const active = server.key === selectedServer;
                const isDefault = i === 0;
                return (
                  <button
                    key={server.key}
                    onClick={() => handleServerSwitch(server.key)}
                    className={cn(
                      "shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all active:scale-[0.97]",
                      active
                        ? isDefault
                          ? "border-[#e50914]/40 bg-[#e50914]/15 text-white"
                          : "border-white/20 bg-white/10 text-white"
                        : "border-white/6 bg-white/[0.02] text-white/40 hover:border-white/14 hover:bg-white/[0.05] hover:text-white/70",
                    )}
                  >
                    {server.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-white/6 px-4 py-2">
            <p className="text-center text-[10px] text-white/25">
              If the player is blocked by your browser, use{" "}
              <button onClick={openInNewTab} className="underline hover:text-white/50">
                open in new tab
              </button>
              .
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
