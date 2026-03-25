import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, X } from "lucide-react";
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

  useEffect(() => {
    if (!open) return;
    setSelectedServer("superembed");
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

  const openInNewTab = (serverKey: ServerKey) => {
    const url = buildUrlFor(serverKey);
    window.open(url, "_blank", "noopener,noreferrer");
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
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[94%] max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-white/6 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[16px] font-bold text-white sm:text-[18px]">
                  {payload.title}{episodeLabel}
                </h3>
                <p className="mt-1 text-[12px] text-white/40">Choose a server — opens in a new tab</p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Server list */}
          <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4">
            <div className="space-y-2">
              {SERVERS.map((server, i) => {
                const isDefault = i === 0;
                return (
                  <button
                    key={server.key}
                    onClick={() => { setSelectedServer(server.key); openInNewTab(server.key); }}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.98]",
                      isDefault
                        ? "border-[#e50914]/25 bg-[#e50914]/8 hover:bg-[#e50914]/15"
                        : "border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-bold",
                        isDefault ? "bg-[#e50914] text-white" : "bg-white/6 text-white/50"
                      )}>
                        <Play size={14} className={isDefault ? "fill-white" : ""} />
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-white">{server.label}</div>
                        {isDefault && (
                          <div className="text-[11px] text-[#e50914]/80 font-medium">Recommended</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/30 transition group-hover:text-white/60">
                      <span className="text-[11px] font-medium hidden sm:inline">Open</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15,3 21,3 21,9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer hint */}
          <div className="border-t border-white/6 px-5 py-3 sm:px-6">
            <p className="text-center text-[11px] text-white/30">
              If a server doesn't work, try another one. All links open in a new tab.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
