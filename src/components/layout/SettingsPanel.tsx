import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cloud, Download, HelpCircle, LogIn, LogOut, Upload, User, X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { CLOUD_SETUP_SQL } from "../../config";
import type { AuthMode, CloudMode, CloudUser } from "../../types";

export function SettingsPanel({
  open,
  onClose,
  onImport,
  onExport,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  cloudMode,
  anchorTop = 88,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  currentUser: CloudUser | null;
  onOpenAuth: (mode: AuthMode) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  cloudMode: CloudMode;
  anchorTop?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const cloudColor =
    cloudMode === "ready"
      ? "text-emerald-400"
      : cloudMode === "missing_table"
      ? "text-amber-400"
      : "text-white/30";
  const cloudLabel =
    cloudMode === "ready"
      ? "Cloud sync active"
      : cloudMode === "missing_table"
      ? "Cloud table missing"
      : currentUser
      ? "Checking sync..."
      : "Not syncing";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-4 w-[310px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1117] shadow-[0_24px_60px_rgba(0,0,0,0.55)] md:right-6"
            style={{ top: `${anchorTop ?? 88}px` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="text-[16px] font-bold text-white">Settings</div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-white/35 transition hover:bg-white/8 hover:text-white/70"
              >
                <X size={16} />
              </button>
            </div>

            {/* Account section */}
            <div className="px-3 pt-3 pb-2">
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Account</div>

              {currentUser ? (
                <div className="space-y-0.5">
                  {/* User info pill */}
                  <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] border border-white/6 px-3.5 py-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8a020]/15 text-[14px] font-bold text-[#e8a020]">
                      {(currentUser.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{currentUser.email}</div>
                      <div className={cn("flex items-center gap-1.5 text-[11px] mt-0.5", cloudColor)}>
                        <Cloud size={11} />
                        <span>{cloudLabel}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { onOpenProfile(); onClose(); }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <User size={16} className="text-cyan-400" /> Profile & Settings
                  </button>
                  <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <LogOut size={16} className="text-rose-400" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 mb-1">
                  <button
                    onClick={() => { onOpenAuth("login"); onClose(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-[#e8a020] h-11 text-[14px] font-bold text-black transition hover:brightness-110"
                  >
                    <LogIn size={16} /> Sign In
                  </button>
                  <button
                    onClick={() => { onOpenAuth("signup"); onClose(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-white/10 bg-white/[0.04] h-11 text-[14px] font-semibold text-white/80 transition hover:bg-white/[0.08]"
                  >
                    <User size={16} /> Create Account
                  </button>
                  <div className="flex items-center gap-2 px-1 pt-1 text-[12px] text-white/30">
                    <Cloud size={12} />
                    <span>Sign in to enable cloud sync</span>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-white/6" />

            {/* Data section */}
            <div className="px-3 py-3">
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Data</div>

              {cloudMode === "missing_table" && (
                <div className="mb-2 rounded-[12px] border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
                  <div className="text-[12px] text-amber-400 font-medium mb-1.5">Cloud table missing</div>
                  <div className="text-[11px] text-white/45 mb-2">
                    Run setup SQL in Supabase SQL Editor, then reload.
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(CLOUD_SETUP_SQL)}
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Copy setup SQL
                  </button>
                </div>
              )}

              <label className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white">
                <Upload size={16} className="text-emerald-400" />
                <span>Import Library</span>
                <span className="ml-auto text-[10px] font-semibold text-white/25">JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { onImport(file); onClose(); }
                    e.target.value = "";
                  }}
                />
              </label>

              <button
                onClick={() => { onExport(); onClose(); }}
                className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Download size={16} className="text-blue-400" />
                <span>Export Library</span>
                <span className="ml-auto text-[10px] font-semibold text-white/25">SAVE</span>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-white/6" />

            {/* Help */}
            <div className="px-3 py-3">
              <button
                onClick={() => window.alert("Help is not configured yet.")}
                className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
              >
                <HelpCircle size={16} className="text-pink-400" />
                <span>Help & Support</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
