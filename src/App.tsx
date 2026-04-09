// GoodFilm v3.1 - Full mobile responsive refactor
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  Film,
  Home,  List,
  Play,
  Search,
  Star,
  Tv,
  Upload,
  User,
  X,
  Settings,  LogIn,
  HelpCircle,  LogOut,
  Cloud,
  Mail,
  Lock,
  RefreshCw,
  Shield,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Sparkles,
  LayoutList
} from "lucide-react";
// ── Config ────────────────────────────────────────────────────────────────────
import {
  POSTER_BASE, BACKDROP_BASE,
  HAS_SUPABASE as hasSupabase,
  CLOUD_SETUP_SQL,
} from "./config";

// ── Mobile components ─────────────────────────────────────────────────────────
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import { MobileTopBar } from "./components/layout/MobileTopBar";
import { MobileHome } from "./components/mobile/MobileHome";
import type { MobileStreamItem, HomeRow } from "./components/mobile/MobileHome";
import { MobileDetailPanel } from "./components/mobile/MobileDetailPanel";

// ── Types ─────────────────────────────────────────────────────────────────────
import type {
  Tab, AuthMode, MediaType, AppLanguage, CloudMode,
  MediaItem, Genre, SeasonInfo, DetailData, IMDbTitleData, OmdbData,
  CastMember, Episode, VideoResult,
  LibraryItem, WatchingProgress, UserLibrary, ImportExportPayload, CustomList, CustomListItem,
  CloudUser, CloudLibraryRow,
  Visibility, ProfilePrivacy, ProfileViewerRole, ProfileTabKey, UserProfile,
  SupabaseRuntimeError,
} from "./types";
import { defaultLibrary, DEFAULT_PRIVACY } from "./types";

// ── Utilities ─────────────────────────────────────────────────────────────────
import { cn } from "./utils/cn";
import { tr, loadLanguage } from "./utils/i18n";
import {
  getTitle, getYear, normalizeMedia, keyFor,
  uniqueMediaItems, uniqueRowDefinitions,
  dedupeLibraryItems, normalizeEpisodeNumbers,
  sanitizeLibrary, libraryScore, mergeLibraries, mapWithConcurrency,
} from "./utils/library";
import {
  loadLibrary, saveLibrary,
  loadUserProfile, saveUserProfile,
  getLibraryUpdatedAt, setLibraryUpdatedAt,
} from "./utils/storage";
import { validatePasswordStrength, normalizeAuthErrorMessage, buildDefaultProfile } from "./utils/auth";
import { formatProfileDate } from "./utils/format";

// ── Services ──────────────────────────────────────────────────────────────────
import {
  tmdbFetch, fetchTMDBLogoPath, searchTMDBMatchForLibraryItem,
  imdbFetchTitle, extractIMDbRating, extractIMDbVotes,
} from "./services/tmdb";
import { omdbFetch } from "./services/omdb";
import {
  supabase,
  uploadLibraryToCloud, downloadLibraryFromCloud,
  isCloudTableUnavailable, markCloudTableUnavailable,
  isMissingCloudTableError,
} from "./services/supabase";
import {
  fetchWatchmodeSources,
} from "./services/apiSources.js";

// ── Mobile detection ──────────────────────────────────────────────────────────
const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;
const USE_SIMPLE_ANIMATIONS = IS_MOBILE;

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Auth Typewriter ───────────────────────────────────────────────────────────
function AuthTypewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setDisplayed(""); setIdx(0);
  }, [text]);
  useEffect(() => {
    if (idx >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed(p => p + text[idx]);
      setIdx(p => p + 1);
    }, 42);
    return () => clearTimeout(t);
  }, [idx, text]);
  return (
    <span>
      {displayed}
      <span className="animate-pulse opacity-70">|</span>
    </span>
  );
}

const AUTH_PANELS = {
  login: {
    backdrop: "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg",
    quote: "The stuff that dreams are made of.",
    film: "The Maltese Falcon"
  },
  signup: {
    backdrop: "https://image.tmdb.org/t/p/original/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    quote: "Every passing minute is another chance to turn it all around.",
    film: "Vanilla Sky"
  },
};


function AuthModal({
  open,
  mode,
  setMode,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess: (user: CloudUser, mode: AuthMode, profile?: UserProfile) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail(""); setPassword(""); setConfirmPassword(""); setUsername("");
      setMessage(null); setLoading(false); setShowPass(false); setShowConfirm(false);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Enter key submits
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !loading) handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, email, password, confirmPassword, username, loading]);

  const handleSubmit = async () => {
    if (!email.trim()) { setMessage("Enter a valid email address."); return; }
    if (mode === "signup") {
      if (!username.trim() || username.trim().length < 3) { setMessage("Choose a username with at least 3 characters."); return; }
      if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
      const passwordError = validatePasswordStrength(password);
      if (passwordError) { setMessage(passwordError); return; }
    } else {
      if (password.length < 6) { setMessage("Enter your password."); return; }
    }
    setLoading(true);
    setMessage(null);
    try {
      if (!supabase) { setMessage("Supabase authentication is not configured."); return; }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user?.id && data.user.email) {
          const profile = buildDefaultProfile(data.user.email, username.trim());
          saveUserProfile(data.user.email, profile);
          onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode, profile);
          onClose();
        } else {
          setMessage("Check your email to confirm your account.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user?.id && data.user.email) {
          const profile = loadUserProfile(data.user.email);
          const nextProfile = { ...profile, lastLogin: new Date().toISOString() };
          saveUserProfile(data.user.email, nextProfile);
          onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode, nextProfile);
          onClose();
        }
      }
    } catch (err: any) {
      setMessage(normalizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  const inputClass = "flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-3.5 focus-within:border-[#efb43f]/50 focus-within:bg-white/[0.09] transition";

  const panel = AUTH_PANELS[isLogin ? "login" : "signup"];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={e => e.stopPropagation()}
            className="flex w-full max-w-[860px] overflow-hidden rounded-[16px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] mx-3 md:mx-4 md:rounded-[24px]"
            style={{ minHeight: "auto" }}
          >
            {/* ── LEFT: Form panel ── */}
            <div className="flex w-full flex-col justify-center bg-[#0c0d14] px-5 py-8 sm:px-8 md:w-[420px] md:shrink-0 md:px-10">
              {/* Logo + close */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f]">
                    <Film size={14} className="text-black" />
                  </div>
                  <span className="text-[15px] font-black tracking-[-0.02em] text-white">GoodFilm</span>
                </div>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/40 transition hover:bg-white/14 hover:text-white">
                  <X size={15} />
                </button>
              </div>

              {/* Heading */}
              <div className="mb-7">
                <h2 className="text-[26px] font-black tracking-[-0.04em] text-white">
                  {isLogin ? "Welcome back" : "Create account"}
                </h2>
                <p className="mt-1 text-[13px] text-white/40">
                  {isLogin ? "Sign in to sync your list across devices" : "Join GoodFilm and start tracking films"}
                </p>
              </div>

              {/* Fields */}
              <div className="space-y-3.5">
                {!isLogin && (
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-white/50">Username</div>
                    <div className={inputClass}>
                      <User size={15} className="shrink-0 text-white/25" />
                      <input value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Choose a username" autoComplete="username"
                        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-white/50">Email</div>
                  <div className={inputClass}>
                    <Mail size={15} className="shrink-0 text-white/25" />
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" type="email" autoComplete="email"
                      className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-white/50">Password</div>
                  <div className={inputClass}>
                    <Lock size={15} className="shrink-0 text-white/25" />
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isLogin ? "Your password" : "Create a strong password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="shrink-0 text-white/25 transition hover:text-white/60">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-white/50">Confirm Password</div>
                    <div className={inputClass}>
                      <Lock size={15} className="shrink-0 text-white/25" />
                      <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password" autoComplete="new-password"
                        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="shrink-0 text-white/25 transition hover:text-white/60">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {message && (
                  <div className="flex items-center gap-2 rounded-[12px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-400">
                    <X size={13} className="shrink-0" /> {message}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={loading}
                  className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-[#efb43f] text-[14px] font-black text-black shadow-[0_4px_20px_rgba(239,180,63,0.35)] transition hover:brightness-110 disabled:opacity-50">
                  {loading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}><RefreshCw size={16} /></motion.div>
                    : isLogin ? <LogIn size={16} /> : <User size={16} />}
                  {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
                </button>

                <div className="pt-1 text-center text-[12px] text-white/35">
                  {isLogin ? "No account yet? " : "Already have one? "}
                  <button onClick={() => { setMode(isLogin ? "signup" : "login"); setMessage(null); }}
                    className="font-semibold text-[#efb43f] transition hover:underline">
                    {isLogin ? "Create account" : "Sign in"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Cinematic backdrop + typewriter quote — hidden on mobile ── */}
            <div className="relative hidden flex-1 md:block">
              {/* Backdrop image crossfades on mode change */}
              <AnimatePresence mode="sync">
                <motion.div key={panel.backdrop}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0"
                >
                  <img src={panel.backdrop} alt="" className="pointer-events-none h-full w-full object-cover object-center" />
                </motion.div>
              </AnimatePresence>

              {/* Dark overlays */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_40%,rgba(0,0,0,0.75)_100%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(12,13,20,0.6)_0%,transparent_50%)]" />

              {/* Quote at bottom */}
              <div className="absolute inset-x-0 bottom-0 p-8">
                <blockquote className="space-y-2">
                  <p className="text-[16px] font-semibold italic leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    "<AnimatePresence mode="wait">
                      <motion.span key={panel.quote} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                        <AuthTypewriter text={panel.quote} />
                      </motion.span>
                    </AnimatePresence>"
                  </p>
                  <cite className="block text-[12px] font-medium not-italic text-white/50">— {panel.film}</cite>
                </blockquote>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  SETTINGS OVERLAY — standalone overlay, no profile logic inside
// ══════════════════════════════════════════════════════════════════════════════
function SettingsOverlay({
  open, onClose, currentUser, profile, onUpdateProfile, onLogout,
  library, onNavigateProfile,
}: {
  open: boolean; onClose: () => void; currentUser: CloudUser | null;
  profile: UserProfile | null; onUpdateProfile: (u: Partial<UserProfile>) => void;
  onLogout: () => void; library: UserLibrary; onNavigateProfile: () => void;
}) {
  type SettingsTab = "account" | "billing" | "security" | "profile_settings" | "playback";
  const [tab, setTab] = useState<SettingsTab>("account");
  const [editing, setEditing] = useState<null | "username" | "password">(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [autoplayPreview, setAutoplayPreview] = useState(true);
  const [dataUsage, setDataUsage] = useState<"auto" | "low" | "medium" | "high">("auto");

  useEffect(() => {
    if (open) { setUsernameInput(profile?.username || ""); setTab("account"); setEditing(null); setMessage(null); }
    else { setPassword(""); setConfirmPassword(""); setShowPass(false); setShowConfirm(false); setEditing(null); }
  }, [open, profile?.username]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !currentUser || !profile) return null;

  const initials = (profile.username || currentUser.email || "U").slice(0, 1).toUpperCase();
  const totalWatched   = library.watched.length;
  const totalWatchlist = library.watchlist.length;
  const totalRated     = Object.keys(library.ratings || {}).length;
  const moviesWatched  = library.watched.filter(i => i.mediaType === "movie").length;
  const tvWatched      = library.watched.filter(i => i.mediaType === "tv").length;
  const ratings        = Object.values(library.ratings || {});
  const avgRating      = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length/2).toFixed(1) : null;

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage(text); setMessageType(type); setTimeout(() => setMessage(null), 3200);
  };

  const saveUsername = () => {
    const t = usernameInput.trim();
    if (!t || t.length < 3) { showMsg("Username must be at least 3 characters.", "error"); return; }
    if (t === profile.username) { setEditing(null); return; }
    onUpdateProfile({ username: t }); setEditing(null); showMsg("Username updated.");
  };

  const savePassword = async () => {
    const err = validatePasswordStrength(password);
    if (err) { showMsg(err, "error"); return; }
    if (password !== confirmPassword) { showMsg("Passwords do not match.", "error"); return; }
    if (currentUser.provider === "supabase" && supabase) {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) { showMsg(normalizeAuthErrorMessage(e), "error"); return; }
    }
    setPassword(""); setConfirmPassword(""); setEditing(null); showMsg("Password changed.");
  };

  const NAV: Array<{ key: SettingsTab; label: string; icon: React.ElementType; desc: string }> = [
    { key: "account",          label: "Account",            icon: User,     desc: "Your personal information" },
    { key: "billing",          label: "Billing Details",    icon: Star,     desc: "Subscription & payments" },
    { key: "security",         label: "Security & Privacy", icon: Shield,   desc: "Access control & data" },
    { key: "profile_settings", label: "Profile Settings",   icon: Settings, desc: "Preferences & restrictions" },
    { key: "playback",         label: "Playback Settings",  icon: Play,     desc: "Video & audio quality" },
  ];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[72] flex items-start justify-center overflow-y-auto bg-black/85 p-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={e => e.stopPropagation()}
          className="flex w-full max-w-[900px] overflow-hidden rounded-[16px] border border-white/10 bg-[#0c0e16] shadow-[0_40px_100px_rgba(0,0,0,0.85)] md:rounded-[24px]"
          style={{ minHeight: "min(580px, 90svh)", maxHeight: "92svh" }}>

          {/* Sidebar — hidden on mobile, visible md+ */}
          <div className="hidden md:flex w-[220px] shrink-0 flex-col bg-[#0a0b13] border-r border-white/6">
            <div className="flex flex-col items-center gap-3 border-b border-white/6 px-4 py-6">
              <div className="relative">
                <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border-2 border-[#0a0c12] bg-gradient-to-br from-[#efb43f] to-[#c97d0a] text-[18px] font-black text-black shadow-[0_4px_20px_rgba(239,180,63,0.35)]">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[#0a0c12]" />
              </div>
              <div className="text-center">
                <div className="text-[14px] font-bold text-white">{profile.username}</div>
                <div className="mt-0.5 max-w-[180px] truncate text-[10px] text-white/35">{currentUser.email}</div>
              </div>
              <div className="grid w-full grid-cols-3 gap-1">
                {[{ v: totalWatched, l: "Watched" }, { v: totalWatchlist, l: "List" }, { v: totalRated, l: "Rated" }].map(({ v, l }) => (
                  <div key={l} className="rounded-[8px] bg-white/[0.04] py-2 text-center">
                    <div className="text-[15px] font-black text-white">{v}</div>
                    <div className="text-[8px] text-white/30">{l}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { onClose(); onNavigateProfile(); }}
                className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-white/8 bg-white/[0.03] py-2 text-[11px] font-semibold text-white/45 transition hover:bg-white/8 hover:text-white">
                <User size={10} /> View Profile
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 p-2.5">
              {NAV.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={cn("flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-semibold transition",
                    tab === key ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.05] hover:text-white/75")}>
                  <Icon size={13} className={tab === key ? "text-[#efb43f] shrink-0" : "text-white/25 shrink-0"} />
                  <span>{label}</span>
                  {tab === key && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#efb43f]" />}
                </button>
              ))}
            </nav>
            <div className="space-y-1 border-t border-white/6 p-2.5">
              <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400">
                <LogOut size={13} /> Sign Out
              </button>
              <button onClick={onClose} className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold text-white/25 transition hover:bg-white/[0.04] hover:text-white/55">
                <X size={13} /> Close
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col bg-[#0c0e16] min-w-0">

            {/* Mobile tab strip — only on small screens */}
            <div className="flex overflow-x-auto border-b border-white/6 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
              {NAV.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={cn("flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-2 text-[11px] font-semibold transition mr-1 whitespace-nowrap",
                    tab === key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}>
                  <Icon size={12} className={tab === key ? "text-[#efb43f]" : "text-white/25"} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-3.5 md:px-7 md:py-4">
              <div>
                <h3 className="text-[16px] font-bold text-white">{NAV.find(n => n.key === tab)?.label}</h3>
                <p className="mt-0.5 text-[11px] text-white/30">{NAV.find(n => n.key === tab)?.desc}</p>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/40 transition hover:bg-white/14 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className={cn("mx-6 mt-4 flex items-center gap-2 rounded-[12px] border px-4 py-3 text-[12px] font-semibold shrink-0",
                    messageType === "success" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" : "border-red-500/25 bg-red-500/10 text-red-400")}>
                  {messageType === "success" ? <Check size={13} /> : <X size={13} />} {message}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 md:px-6 md:py-5 md:space-y-4">

              {/* ACCOUNT */}
              {tab === "account" && (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Account Info</span>
                      <button onClick={() => setEditing(editing === "username" ? null : "username")}
                        className={cn("flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-semibold transition",
                          editing === "username" ? "border-[#efb43f]/30 bg-[#efb43f]/10 text-[#efb43f]" : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white")}>
                        <Settings size={10} /> {editing === "username" ? "Cancel" : "Edit"}
                      </button>
                    </div>
                    <div className="divide-y divide-white/5 px-5">
                      {[
                        { l: "Display Name", v: profile.username },
                        { l: "Email",        v: currentUser.email },
                        { l: "Member Since", v: formatProfileDate(profile.memberSince) },
                        { l: "Last Login",   v: formatProfileDate(profile.lastLogin) },
                      ].map(({ l, v }) => (
                        <div key={l} className="flex items-center justify-between py-3">
                          <span className="text-[12px] text-white/40 shrink-0 w-28">{l}</span>
                          <span className="text-[13px] font-medium text-white/80 text-right truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                    <AnimatePresence>
                      {editing === "username" && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-white/6">
                          <div className="p-5 space-y-3">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold text-white/40">New Username</label>
                              <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveUsername()} placeholder="Enter new username…" autoFocus
                                className="w-full rounded-[10px] border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/20 focus:border-[#efb43f]/40 transition" />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setEditing(null); setUsernameInput(profile.username); }} className="rounded-[9px] border border-white/10 px-4 py-1.5 text-[12px] font-semibold text-white/40 transition hover:text-white/70">Cancel</button>
                              <button onClick={saveUsername} className="rounded-[9px] bg-[#efb43f] px-4 py-1.5 text-[12px] font-bold text-black transition hover:brightness-110">Save</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="rounded-[14px] border border-white/8 bg-white/[0.025] p-5">
                    <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Viewing Activity</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: "Movies Watched", value: moviesWatched, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { label: "TV Shows",        value: tvWatched,      color: "text-blue-400",   bg: "bg-blue-500/10" },
                        { label: "Watchlist",       value: totalWatchlist, color: "text-[#efb43f]",  bg: "bg-[#efb43f]/10" },
                        { label: "Rated",           value: totalRated,     color: "text-purple-400", bg: "bg-purple-500/10" },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} className={cn("rounded-[12px] p-4", bg)}>
                          <div className={cn("text-[24px] font-black leading-none", color)}>{value}</div>
                          <div className="mt-1.5 text-[11px] text-white/40">{label}</div>
                        </div>
                      ))}
                    </div>
                    {avgRating && (
                      <div className="mt-3 flex items-center justify-between rounded-[12px] bg-white/[0.03] px-4 py-3">
                        <span className="text-[12px] text-white/40">Average Rating</span>
                        <div className="flex items-center gap-1.5">
                          <Star size={13} className="fill-[#efb43f] text-[#efb43f]" />
                          <span className="text-[16px] font-black text-[#efb43f]">{avgRating}</span>
                          <span className="text-[11px] text-white/30">/ 5</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* BILLING */}
              {tab === "billing" && (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="border-b border-white/6 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Billing Details</div>
                    <div className="divide-y divide-white/5 px-5">
                      {[{ l: "Billing Day", v: "13th of each month" }, { l: "Card Number", v: "•••• •••• •••• 4444" }, { l: "Plan Details", v: "Basic HD" }, { l: "Billing Date", v: "February 13, 2026" }].map(({ l, v }) => (
                        <div key={l} className="flex items-center justify-between py-3">
                          <span className="text-[12px] text-white/40 w-28 shrink-0">{l}</span>
                          <span className="text-[13px] font-medium text-white/80">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {["Add backup payment method", "Redeem gift card or promo code"].map(label => (
                    <button key={label} className="flex w-full items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.025] px-5 py-4 text-[13px] font-semibold text-white/55 transition hover:bg-white/[0.04] hover:text-white">
                      {label} <ChevronRight size={14} className="text-white/25 shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {/* SECURITY */}
              {tab === "security" && (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="border-b border-white/6 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Access & Privacy</div>
                    {["Manage access and devices", "Download your personal information", "Sign out of all devices"].map(label => (
                      <button key={label} className="flex w-full items-center justify-between border-b border-white/5 px-5 py-4 text-[13px] text-white/65 transition hover:bg-white/[0.03] hover:text-white last:border-0">
                        {label} <ChevronRight size={13} className="text-white/20 shrink-0" />
                      </button>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Password</span>
                      <button onClick={() => setEditing(editing === "password" ? null : "password")}
                        className={cn("flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-semibold transition",
                          editing === "password" ? "border-[#efb43f]/30 bg-[#efb43f]/10 text-[#efb43f]" : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white")}>
                        <Shield size={10} /> {editing === "password" ? "Cancel" : "Change"}
                      </button>
                    </div>
                    <div className="px-5 py-4 text-[13px] text-white/35 tracking-[0.2em]">••••••••</div>
                    <AnimatePresence>
                      {editing === "password" && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-white/6">
                          <div className="p-5 space-y-3">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold text-white/40">New Password</label>
                              <div className="relative">
                                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password"
                                  className="w-full rounded-[10px] border border-white/12 bg-white/[0.05] px-3.5 py-2.5 pr-10 text-[13px] text-white outline-none placeholder:text-white/20 focus:border-[#efb43f]/40 transition" />
                                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white/60">
                                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold text-white/40">Confirm Password</label>
                              <div className="relative">
                                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password"
                                  className="w-full rounded-[10px] border border-white/12 bg-white/[0.05] px-3.5 py-2.5 pr-10 text-[13px] text-white outline-none placeholder:text-white/20 focus:border-[#efb43f]/40 transition" />
                                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white/60">
                                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>
                            {confirmPassword && (
                              <div className={cn("flex items-center gap-1.5 text-[11px]", password === confirmPassword ? "text-emerald-400" : "text-red-400")}>
                                {password === confirmPassword ? <Check size={11} /> : <X size={11} />}
                                {password === confirmPassword ? "Passwords match" : "Passwords don't match"}
                              </div>
                            )}
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setEditing(null); setPassword(""); setConfirmPassword(""); }} className="rounded-[9px] border border-white/10 px-4 py-1.5 text-[12px] font-semibold text-white/40 transition hover:text-white/70">Cancel</button>
                              <button onClick={savePassword} disabled={!password || password !== confirmPassword} className="rounded-[9px] bg-[#efb43f] px-4 py-1.5 text-[12px] font-bold text-black transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed">Save Password</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* PROFILE SETTINGS */}
              {tab === "profile_settings" && (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="border-b border-white/6 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Display</div>
                    <div className="divide-y divide-white/5 px-5">
                      <div className="flex items-center justify-between py-3.5"><span className="text-[13px] text-white/65">Language</span><span className="rounded-[8px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] text-white/60">English</span></div>
                      <div className="flex items-center justify-between py-3.5"><span className="text-[13px] text-white/65">Viewing Restrictions</span><span className="max-w-[180px] truncate text-[12px] text-white/40">{currentUser.email}</span></div>
                      <div className="flex items-center justify-between py-3.5">
                        <div><div className="text-[13px] text-white/65">Profile Lock</div><div className="text-[10px] text-white/30 mt-0.5">Lock with a 4-digit PIN</div></div>
                        <button className="flex items-center gap-1.5 rounded-[8px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] text-white/50 transition hover:text-white"><Lock size={10} /> Off</button>
                      </div>
                    </div>
                  </div>
                  {["Transfer Profile", "Viewing & Rating Activity", "Subtitle Appearance", "Communication Settings"].map(label => (
                    <button key={label} className="flex w-full items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.025] px-5 py-4 text-[13px] font-semibold text-white/55 transition hover:bg-white/[0.04] hover:text-white">
                      {label} <ChevronRight size={14} className="text-white/25 shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {/* PLAYBACK */}
              {tab === "playback" && (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="border-b border-white/6 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Autoplay</div>
                    {[
                      { label: "Autoplay next episode in a series on all devices", sub: "Seamlessly continue watching", value: autoplayNext, set: setAutoplayNext },
                      { label: "Autoplay previews while browsing on all devices", sub: "Show previews on hover", value: autoplayPreview, set: setAutoplayPreview },
                    ].map(({ label, sub, value, set }) => (
                      <button key={label} onClick={() => set(v => !v)} className="flex w-full items-center justify-between border-b border-white/5 px-5 py-4 transition hover:bg-white/[0.02] last:border-0">
                        <div className="text-left"><div className="text-[13px] text-white/70">{label}</div><div className="text-[10px] text-white/30 mt-0.5">{sub}</div></div>
                        <div className={cn("ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition", value ? "bg-[#efb43f] shadow-[0_2px_8px_rgba(239,180,63,0.4)]" : "border border-white/20")}>
                          {value && <Check size={10} className="text-black" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.025]">
                    <div className="border-b border-white/6 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">Data Usage per Screen</div>
                    {([
                      { key: "auto",   label: "Auto",   sub: "Adjusts automatically" },
                      { key: "low",    label: "Low",     sub: "Lower quality, saves data" },
                      { key: "medium", label: "Medium",  sub: "Standard quality, ~0.7 GB/hr" },
                      { key: "high",   label: "High",    sub: "Best quality, ~3 GB/hr (HD)" },
                    ] as const).map(({ key, label, sub }) => (
                      <button key={key} onClick={() => setDataUsage(key)} className="flex w-full items-center justify-between border-b border-white/5 px-5 py-3.5 transition hover:bg-white/[0.02] last:border-0">
                        <div className="text-left"><div className={cn("text-[13px] font-semibold", dataUsage === key ? "text-white" : "text-white/55")}>{label}</div><div className="text-[10px] text-white/30 mt-0.5">{sub}</div></div>
                        <div className={cn("ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition", dataUsage === key ? "bg-[#efb43f] shadow-[0_2px_8px_rgba(239,180,63,0.4)]" : "border border-white/20")}>
                          {dataUsage === key && <Check size={10} className="text-black" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRIVACY GATE — renders section based on viewer role + visibility setting
// ══════════════════════════════════════════════════════════════════════════════
function PrivacyGate({ visibility, role, children, sectionLabel }: {
  visibility: Visibility; role: ProfileViewerRole;
  children: React.ReactNode; sectionLabel?: string;
}) {
  const canView = (
    role === "owner" ||
    visibility === "public" ||
    (visibility === "friends" && role === "friend")
  );
  if (canView) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-white/6 bg-white/[0.02] py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05]">
        <Lock size={20} className="text-white/25" />
      </div>
      <div className="text-[13px] font-semibold text-white/30">
        {visibility === "friends" ? "Friends only" : "Private"}
      </div>
      {sectionLabel && <div className="text-[11px] text-white/20">{sectionLabel} is not public</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROFILE PAGE — full page/tab component (not a modal)
// ══════════════════════════════════════════════════════════════════════════════
function ProfilePage({
  currentUser, profile, library, onUpdateProfile, onLogout,
  onOpenSettings, onOpenDetail, onNavigateHome,
}: {
  currentUser: CloudUser | null; profile: UserProfile | null;
  library: UserLibrary; onUpdateProfile: (u: Partial<UserProfile>) => void;
  onLogout: () => void; onOpenSettings: () => void;
  onOpenDetail: (item: MediaItem, mediaType: MediaType) => void;
  onNavigateHome: () => void;
}) {
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTabKey>("watched");
  const [privacy, setPrivacy] = useState<ProfilePrivacy>(() => profile?.privacy ?? DEFAULT_PRIVACY);

  // Owner always — in a real app this would compare viewer userId to profile userId
  const role: ProfileViewerRole = currentUser ? "owner" : "stranger";

  if (!currentUser || !profile) {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.04]">
          <User size={32} className="text-white/20" />
        </div>
        <div>
          <div className="text-[18px] font-bold text-white/40">No profile</div>
          <div className="mt-1 text-[13px] text-white/25">Sign in to view your profile</div>
        </div>
      </div>
    );
  }

  const initials = (profile.username || currentUser.email || "U").slice(0, 1).toUpperCase();
  const totalWatched   = library.watched.length;
  const totalWatchlist = library.watchlist.length;
  const totalRated     = Object.keys(library.ratings || {}).length;
  const ratings        = Object.values(library.ratings || {});
  const avgRating      = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length/2).toFixed(1) : null;
  const recentWatched  = [...library.watched].reverse().slice(0, 12);
  const recentWatchlist = [...library.watchlist].reverse().slice(0, 12);

  const PROFILE_TABS: Array<{ key: ProfileTabKey; label: string; count: number }> = [
    { key: "watched",   label: "Watched",   count: totalWatched },
    { key: "watchlist", label: "Watchlist", count: totalWatchlist },
    { key: "lists",     label: "Lists",     count: 0 },
    { key: "activity",  label: "Activity",  count: totalRated },
  ];

  const visibilityMap: Record<ProfileTabKey, Visibility> = {
    watched:   privacy.watched,
    watchlist: privacy.watchlist,
    lists:     privacy.lists,
    activity:  privacy.activity,
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-8 pt-4 md:px-6 lg:px-8">

      {/* ── BREADCRUMB ── */}
      <div className="mb-5 flex items-center gap-2 text-[11px] text-white/30">
        <button onClick={onNavigateHome} className="transition hover:text-white/60">Home</button>
        <span>/</span>
        <span className="text-white/55 font-semibold">Profile</span>
      </div>

      {/* ── PROFILE HEADER ── */}
      <div className="relative mb-8 overflow-hidden rounded-[24px] bg-[#0e101a]">
        {/* Hero backdrop — gradient tinted */}
        <div className="h-[120px] bg-[radial-gradient(ellipse_90%_90%_at_50%_-20%,rgba(99,102,241,0.28),transparent_65%)] sm:h-[160px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[160px] bg-[radial-gradient(ellipse_50%_80%_at_82%_50%,rgba(239,180,63,0.1),transparent)]" />

        {/* Top controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#efb43f]">
              <Film size={11} className="text-black" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/35">GoodFilm</span>
          </div>
          {role === "owner" && (
            <button onClick={onOpenSettings}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/50 transition hover:bg-white/12 hover:text-white">
              <Settings size={10} /> Settings
            </button>
          )}
        </div>

        {/* Avatar — overlapping hero */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "112px" }}>
          <div className="relative">
            <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-4 border-[#0e101a] bg-gradient-to-br from-[#efb43f] to-[#c97d0a] text-[22px] font-black text-black shadow-[0_8px_32px_rgba(239,180,63,0.4)] sm:h-[88px] sm:w-[88px] sm:text-[26px]">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[#0e101a]" />
          </div>
        </div>

        {/* Info below avatar */}
        <div className="flex flex-col items-center pb-6 pt-[52px] text-center px-4 sm:pb-7 sm:pt-[68px] sm:px-6">
          <h1 className="text-[19px] font-black tracking-[-0.03em] text-white sm:text-[22px]">{profile.username}</h1>
          <p className="mt-0.5 text-[11px] text-white/35">Member since {formatProfileDate(profile.memberSince)}</p>
          {profile.bio && <p className="mt-2 max-w-[400px] text-[12px] leading-relaxed text-white/45">{profile.bio}</p>}

          {/* Stats */}
          <div className="mt-4 flex flex-wrap items-stretch divide-x divide-white/8 rounded-[14px] border border-white/8 bg-white/[0.025] sm:mt-5 sm:flex-nowrap">
            {[
              { v: totalWatched,   l: "Watched",   c: "text-emerald-400" },
              { v: totalWatchlist, l: "Watchlist",  c: "text-blue-400" },
              { v: totalRated,     l: "Rated",      c: "text-[#efb43f]" },
              ...(avgRating ? [{ v: avgRating, l: "Avg ★", c: "text-purple-400" }] : []),
            ].map(({ v, l, c }) => (
              <div key={l} className="flex flex-col items-center px-5 py-3">
                <div className={cn("text-[18px] font-black leading-none sm:text-[20px]", c)}>{v}</div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/35">{l}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-2.5">
            <button title="X / Twitter" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/40 transition hover:bg-white/10 hover:text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[14px] w-[14px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.26 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </button>
            {role === "owner" && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenSettings}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-5 text-[12px] font-bold text-black shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition hover:bg-white/90">
                <Settings size={12} /> Edit Profile
              </motion.button>
            )}
            <button title="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/40 transition hover:bg-white/10 hover:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── PROFILE TABS ── */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-[14px] border border-white/6 bg-white/[0.02] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROFILE_TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setActiveProfileTab(key)}
            className={cn("relative flex-1 min-w-[72px] rounded-[10px] py-2.5 text-[11px] font-semibold transition sm:min-w-0 sm:text-[12px]",
              activeProfileTab === key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}>
            {label}
            {count > 0 && (
              <span className={cn("ml-1.5 text-[10px]", activeProfileTab === key ? "text-white/50" : "text-white/25")}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Owner privacy toggle for active tab ── */}
      {role === "owner" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-white/6 bg-white/[0.015] px-3 py-2 sm:mb-6 sm:flex-nowrap">
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <Lock size={10} />
            <span>Visibility for <span className="font-semibold text-white/55 capitalize">{activeProfileTab}</span></span>
          </div>
          <div className="flex gap-1">
            {(["public", "friends", "private"] as Visibility[]).map(v => (
              <button key={v} onClick={() => setPrivacy(p => ({ ...p, [activeProfileTab]: v }))}
                className={cn("rounded-[6px] px-2.5 py-1 text-[10px] font-semibold capitalize transition",
                  visibilityMap[activeProfileTab] === v
                    ? v === "public" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : v === "friends" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "text-white/30 hover:text-white/60"
                )}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION RENDERER with privacy gate ── */}
      <PrivacyGate visibility={visibilityMap[activeProfileTab]} role={role} sectionLabel={activeProfileTab}>

        {/* WATCHED */}
        {activeProfileTab === "watched" && (
          <WatchedSection items={recentWatched} ratings={library.ratings} onOpenDetail={onOpenDetail} />
        )}

        {/* WATCHLIST */}
        {activeProfileTab === "watchlist" && (
          <WatchlistSection items={recentWatchlist} onOpenDetail={onOpenDetail} />
        )}

        {/* LISTS */}
        {activeProfileTab === "lists" && (
          <ListsSection watchedCount={totalWatched} watchlistCount={totalWatchlist} ratedCount={totalRated} />
        )}

        {/* ACTIVITY */}
        {activeProfileTab === "activity" && (
          <ActivitySection library={library} />
        )}

      </PrivacyGate>

      {/* Owner sign-out footer */}
      {role === "owner" && (
        <div className="mt-8 flex items-center justify-between border-t border-white/6 pt-6">
          <div className="flex items-center gap-2 text-[11px] text-white/25">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {currentUser.email}
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 rounded-full border border-red-500/18 bg-red-500/8 px-3 py-1.5 text-[11px] font-semibold text-red-400 transition hover:bg-red-500/18">
            <LogOut size={10} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Profile sub-section components ────────────────────────────────────────────
function WatchedSection({ items, ratings, onOpenDetail }: {
  items: LibraryItem[]; ratings: Record<string, number>;
  onOpenDetail: (item: MediaItem, mediaType: MediaType) => void;
}) {
  if (items.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Eye size={32} className="text-white/15" />
      <div className="text-[14px] font-semibold text-white/30">Nothing watched yet</div>
    </div>
  );
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[3px] w-3 rounded-sm bg-emerald-500" />
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45 sm:text-[11px]">Watched · {items.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map(item => {
          const key = keyFor({ id: item.id, mediaType: item.mediaType });
          const userRating = ratings[key];
          return (
            <motion.div key={item.id} whileHover={{ y: -4 }} transition={{ duration: 0.15 }}
              onClick={() => onOpenDetail({ id: item.id, poster_path: item.posterPath, title: item.title, media_type: item.mediaType } as any, item.mediaType)}
              className="group cursor-pointer">
              <div className="aspect-[2/3] overflow-hidden rounded-[10px] bg-white/8 ring-0 transition group-hover:ring-1 group-hover:ring-[#efb43f]/40">
                {item.posterPath
                  ? <img src={`${POSTER_BASE}${item.posterPath}`} alt={item.title} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                  : <div className="flex h-full w-full items-center justify-center"><Film size={14} className="text-white/20" /></div>}
              </div>
              <div className="mt-1.5 space-y-0.5">
                <div className="truncate text-[10px] font-semibold text-white/65 group-hover:text-white/90">{item.title}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-white/30">{item.year}</span>
                  {userRating && <span className="text-[9px] font-bold text-[#efb43f]">★ {(userRating/2).toFixed(1)}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function WatchlistSection({ items, onOpenDetail }: {
  items: LibraryItem[];
  onOpenDetail: (item: MediaItem, mediaType: MediaType) => void;
}) {
  if (items.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Bookmark size={32} className="text-white/15" />
      <div className="text-[14px] font-semibold text-white/30">Watchlist is empty</div>
    </div>
  );
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[3px] w-3 rounded-sm bg-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45 sm:text-[11px]">Watchlist · {items.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(item => (
          <motion.div key={item.id} whileHover={{ y: -3 }} transition={{ duration: 0.15 }}
            onClick={() => onOpenDetail({ id: item.id, poster_path: item.posterPath, backdrop_path: item.backdropPath, title: item.title, media_type: item.mediaType } as any, item.mediaType)}
            className="group relative cursor-pointer overflow-hidden rounded-[12px]">
            <div className="aspect-video overflow-hidden bg-white/8">
              {(item.backdropPath || item.posterPath)
                ? <img src={item.backdropPath ? `${BACKDROP_BASE}${item.backdropPath}` : `${POSTER_BASE}${item.posterPath}`} alt={item.title} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                : <div className="flex h-full w-full items-center justify-center"><Film size={14} className="text-white/20" /></div>}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-6">
              <div className="truncate text-[11px] font-semibold text-white">{item.title}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-white/40">{item.year}</span>
                {item.mediaType === "tv" && <span className="rounded-[3px] bg-blue-500/30 px-1 py-0.5 text-[7px] font-bold text-blue-300">TV</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ListsSection({ watchedCount, watchlistCount, ratedCount }: {
  watchedCount: number; watchlistCount: number; ratedCount: number;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[3px] w-3 rounded-sm bg-[#efb43f]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">My Lists</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Watched", count: watchedCount, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Eye },
          { label: "Watchlist", count: watchlistCount, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Bookmark },
          { label: "Rated", count: ratedCount, color: "text-[#efb43f]", bg: "bg-[#efb43f]/10", border: "border-[#efb43f]/20", icon: Star },
        ].map(({ label, count, color, bg, border, icon: Icon }) => (
          <div key={label} className={cn("flex items-center gap-4 rounded-[16px] border p-5", bg, border)}>
            <Icon size={22} className={cn("shrink-0", color)} />
            <div>
              <div className={cn("text-[28px] font-black leading-none", color)}>{count}</div>
              <div className="mt-1 text-[12px] text-white/45">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySection({ library }: { library: UserLibrary }) {
  const ratings = Object.entries(library.ratings || {});
  // Sort by value desc for most recent isn't available, show all sorted by rating desc
  const sorted = [...ratings].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Star size={32} className="text-white/15" />
      <div className="text-[14px] font-semibold text-white/30">No ratings yet</div>
    </div>
  );

  // keyFor format is "mediaType-id" e.g. "movie-12345" or "tv-67890
  const parseKey = (key: string): { mediaType: string; id: string } => {
    const dashIdx = key.indexOf("-");
    if (dashIdx === -1) return { mediaType: "movie", id: key };
    return { mediaType: key.slice(0, dashIdx), id: key.slice(dashIdx + 1) };
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[3px] w-3 rounded-sm bg-purple-400" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Ratings · {ratings.length}</span>
      </div>
      <div className="space-y-2">
        {sorted.map(([key, rating]) => {
          const { mediaType, id: idStr } = parseKey(key);
          // Look up in both watched and watchlist by numeric id
          const watched   = library.watched.find(w => String(w.id) === idStr);
          const watchlist = library.watchlist.find(w => String(w.id) === idStr);
          const item = watched || watchlist;
          const displayTitle = item?.title || `ID ${idStr}`;
          const displayYear  = item?.year  || "";
          const isTV         = item?.mediaType === "tv" || mediaType === "tv";
          return (
            <div key={key} className="flex items-center gap-2.5 rounded-[10px] border border-white/6 bg-white/[0.02] px-3 py-2.5 sm:gap-3 sm:rounded-[12px] sm:px-4 sm:py-3">
              {/* Poster — show if available, else placeholder */}
              <div className="h-11 w-8 shrink-0 overflow-hidden rounded-[6px] bg-white/8">
                {item?.posterPath
                  ? <img src={`${POSTER_BASE}${item.posterPath}`} alt={displayTitle} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center"><Film size={12} className="text-white/20" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[12px] font-semibold text-white/80 sm:text-[13px]">{displayTitle}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {displayYear && <span className="text-[10px] text-white/35">{displayYear}</span>}
                  <span className={cn("rounded-[3px] px-1 py-0.5 text-[8px] font-bold", isTV ? "bg-blue-500/20 text-blue-300" : "bg-white/8 text-white/40")}>
                    {isTV ? "TV" : "Film"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Star size={12} className="fill-[#efb43f] text-[#efb43f]" />
                <span className="text-[14px] font-black text-[#efb43f]">{(rating / 2).toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Server config ────────────────────────────────────────────────────────────
type ServerKey = "superembed" | "videasy" | "111movies" | "vidking" | "vidlinkpro" | "vidfastpro" | "embedsu" | "autoembed" | "vidsrcicu" | "vidsrcxyz" | "twoembed" | "embedmaster";
type ServerConfig = {
  key: ServerKey;
  label: string;
  badges?: string[];
  buildUrl: (args: { type: MediaType; tmdbId: number | string; season?: number; episode?: number }) => string;
};
const SERVERS: ServerConfig[] = [
  {
    key: "superembed",
    label: "SuperEmbed — Default",
    badges: ["HD"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  },
  {
    key: "embedmaster",
    label: "EmbedMaster",
    badges: ["HD"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://embedmaster.link/tv/${tmdbId}/${season}/${episode}`
        : `https://embedmaster.link/movie/${tmdbId}`,
  },
  {
    key: "videasy",
    label: "Videasy",
    badges: ["Fast", "HD"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
        : `https://player.videasy.net/movie/${tmdbId}`,
  },
  {
    key: "111movies",
    label: "111movies",
    badges: ["Fast"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://111movies.net/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://111movies.net/movie/${tmdbId}?autoplay=1`,
  },
  {
    key: "vidking",
    label: "VidKing",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://www.vidking.net/embed/movie/${tmdbId}`,
  },
  {
    key: "vidlinkpro",
    label: "Vidlink Pro",
    badges: ["HD", "Sub"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
        : `https://vidlink.pro/movie/${tmdbId}`,
  },
  {
    key: "vidfastpro",
    label: "VidFast Pro",
    badges: ["Fast"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidfast.net/tv/${tmdbId}/${season}/${episode}`
        : `https://vidfast.net/movie/${tmdbId}`,
  },
  {
    key: "embedsu",
    label: "Embed.su",
    badges: ["Sub"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://embed.su/embed/movie/${tmdbId}`,
  },
  {
    key: "autoembed",
    label: "AutoEmbed",
    badges: ["HD"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
  },
  {
    key: "vidsrcicu",
    label: "VidSrc ICU",
    badges: ["Sub", "Dub"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.icu/embed/movie/${tmdbId}`,
  },
  {
    key: "vidsrcxyz",
    label: "Vidsrc XYZ",
    badges: ["HD"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.xyz/embed/movie/${tmdbId}`,
  },
  {
    key: "twoembed",
    label: "2Embed",
    badges: ["Sub"],
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://www.2embed.stream/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://www.2embed.stream/embed/movie/${tmdbId}`,
  },
];

// ── Watch Providers (Where to Watch) ─────────────────────────────────────────
type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};
type WatchProvidersResult = {
  results?: Record<string, {
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
    free?: WatchProvider[];
  }>;
};

async function fetchWatchProviders(mediaType: MediaType, tmdbId: number): Promise<WatchProvidersResult | null> {
  try {
    return await tmdbFetch<WatchProvidersResult>(`/${mediaType}/${tmdbId}/watch/providers`);
  } catch {
    return null;
  }
}


// ── Person Modal (Actor/Director detail) ─────────────────────────────────────
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
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  character?: string;
  job?: string;
  media_type?: string;
};

function PersonModal({
  open, personId, onClose, onOpenItem, isFollowed, onToggleFollow,
}: {
  open: boolean; personId: number | null; onClose: () => void;
  onOpenItem: (item: MediaItem, mediaType: MediaType) => void;
  isFollowed: boolean;
  onToggleFollow: (person: { id: number; name: string; profilePath: string | null; knownFor: string }) => void;
}) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [movieCredits, setMovieCredits] = useState<PersonCredit[]>([]);
  const [tvCredits, setTvCredits] = useState<PersonCredit[]>([]);
  const [directedCredits, setDirectedCredits] = useState<PersonCredit[]>([]);
  const [upcomingCredits, setUpcomingCredits] = useState<PersonCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [segment, setSegment] = useState<"movies" | "series" | "directed" | "upcoming">("movies");
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !personId) return;
    setShowFullBio(false); setPerson(null); setMovieCredits([]); setTvCredits([]);
    setDirectedCredits([]); setUpcomingCredits([]); setBackdropUrl(null); setLoading(true); setSegment("movies");
    Promise.all([
      tmdbFetch<PersonDetail>(`/person/${personId}`),
      tmdbFetch<{ cast: PersonCredit[]; crew: PersonCredit[] }>(`/person/${personId}/combined_credits`),
    ]).then(([p, c]) => {
      setPerson(p);
      const dedup = (arr: PersonCredit[]) => {
        const seen = new Set<number>();
        return arr.filter(x => x.poster_path && (!seen.has(x.id) && seen.add(x.id)));
      };
      const cast = c.cast || [];
      const crew = c.crew || [];
      const today = new Date().toISOString().slice(0, 10);

      // Cast credits (movies + TV)
      const movies = dedup(cast.filter(x => x.media_type === "movie"))
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 20);
      const tv = dedup(cast.filter(x => x.media_type === "tv"))
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 20);
      setMovieCredits(movies);
      setTvCredits(tv);

      // Directed credits
      const directed = dedup(crew.filter(x => x.job === "Director"))
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 30);
      setDirectedCredits(directed);

      // Upcoming: all credits with future or missing release date
      const allCredits = [...cast, ...crew.filter(x => x.job === "Director")];
      const upcoming = dedup(allCredits.filter(x => {
        const d = x.release_date || x.first_air_date;
        return !d || d > today;
      })).slice(0, 24);
      setUpcomingCredits(upcoming);

      // Backdrop from top credit
      const top = [...movies, ...tv, ...directed].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0];
      if (top?.poster_path) setBackdropUrl(`${POSTER_BASE}${top.poster_path}`);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, personId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bio = person?.biography || "";
  const actorCount = movieCredits.length + tvCredits.length;

  const SEGMENTS = [
    { key: "movies" as const,   label: `Movies (${movieCredits.length})`,     show: movieCredits.length > 0   },
    { key: "series" as const,   label: `Series (${tvCredits.length})`,         show: tvCredits.length > 0      },
    { key: "directed" as const, label: `Directed (${directedCredits.length})`, show: directedCredits.length > 0 },
    { key: "upcoming" as const, label: `Upcoming (${upcomingCredits.length})`, show: upcomingCredits.length > 0 },
  ].filter(s => s.show);

  const currentCredits =
    segment === "movies"   ? movieCredits   :
    segment === "series"   ? tvCredits      :
    segment === "directed" ? directedCredits :
    upcomingCredits;

  const isDirector = directedCredits.length > 0;
  const segmentLabel =
    segment === "movies"   ? "Movies"            :
    segment === "series"   ? "TV Series"          :
    segment === "directed" ? "Directed Filmography" :
    "Upcoming";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-[900px] overflow-hidden rounded-[16px] border border-white/10 bg-[#0a0c12] shadow-[0_40px_100px_rgba(0,0,0,0.8)] my-4 sm:my-6 md:rounded-[24px]"
        >
          {loading || !person ? (
            <div className="flex h-64 items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={28} className="text-white/30" />
              </motion.div>
            </div>
          ) : (
            <>
              {/* ── HERO BACKDROP ── */}
              <div className="relative h-[200px] overflow-hidden sm:h-[280px]">
                {backdropUrl && (
                  <img src={backdropUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-30 blur-sm scale-105" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(10,12,18,0.6)] to-[#0a0c12]" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0c12]/60 to-transparent" />

                {/* Close button */}
                <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/50 backdrop-blur-sm transition hover:bg-black/60 hover:text-white sm:right-5 sm:top-5">
                  <X size={16} />
                </button>

                {/* Portrait + name */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-6">
                  <div className="mb-3 h-24 w-24 overflow-hidden rounded-full border-[3px] border-white/20 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                    {person.profile_path
                      ? <img src={`${POSTER_BASE}${person.profile_path}`} alt={person.name} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-white/20"><User size={36} /></div>}
                  </div>
                  <h2 className="text-[26px] font-black tracking-[-0.03em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{person.name}</h2>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-white/45">
                    {isDirector && <span className="rounded-md bg-[#efb43f]/15 border border-[#efb43f]/25 px-2 py-0.5 text-[10px] font-bold text-[#efb43f]/80 uppercase tracking-wider">Director</span>}
                    {person.birthday && <span>{person.birthday}{person.place_of_birth ? ` · ${person.place_of_birth}` : ""}</span>}
                  </div>
                </div>
              </div>

              {/* ── STATS ROW ── */}
              <div className="flex items-center justify-center gap-8 border-b border-white/6 py-4">
                {[
                  { count: actorCount, label: person.known_for_department || "Credits" },
                  { count: movieCredits.length, label: "Movies" },
                  { count: tvCredits.length, label: "Series" },
                  ...(isDirector ? [{ count: directedCredits.length, label: "Directed" }] : []),
                ].map(({ count, label }) => (
                  <div key={label} className="text-center">
                    <div className="text-[28px] font-black text-white leading-none">{count}</div>
                    <div className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {/* ── ACTION BUTTONS ── */}
              <div className="flex items-center justify-center gap-3 py-4 border-b border-white/6">
                {/* Follow / Following button */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onToggleFollow({ id: person.id, name: person.name, profilePath: person.profile_path || null, knownFor: person.known_for_department || "Actor" })}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-bold transition backdrop-blur-sm",
                    isFollowed
                      ? "bg-[#efb43f] text-black shadow-[0_4px_20px_rgba(239,180,63,0.35)] hover:brightness-105"
                      : "border border-white/15 bg-white/[0.07] text-white/60 hover:bg-white/12 hover:text-white"
                  )}
                >
                  {isFollowed
                    ? <><Check size={14} className="shrink-0" /> Following</>
                    : <><Plus size={14} className="shrink-0" /> Follow</>
                  }
                </motion.button>

                {person.biography && (
                  <button onClick={() => setShowFullBio(v => !v)}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-6 text-[13px] font-bold text-black transition hover:bg-white/90">
                    {showFullBio ? "Hide Bio" : "About"}
                  </button>
                )}
                <a href={`https://www.imdb.com/find/?q=${encodeURIComponent(person.name)}`} target="_blank" rel="noopener noreferrer"
                  className="flex h-10 items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-4 text-[12px] font-bold text-[#f5c518] transition hover:bg-[#f5c518]/20">
                  <span className="rounded-[4px] bg-[#f5c518] px-1.5 py-0.5 text-[9px] font-black text-black">IMDb</span>
                </a>
              </div>

              {/* Bio panel */}
              <AnimatePresence>
                {showFullBio && bio && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden border-b border-white/6 bg-white/[0.02]">
                    <p className="px-8 py-5 text-[13px] leading-[1.9] text-white/60">{bio}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── CREDITS SEGMENTS ── */}
              <div className="px-7 pt-6 pb-2">
                <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                  <h3 className="text-[17px] font-bold text-white">{segmentLabel}</h3>
                  {/* Segment pills */}
                  <div className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                    {SEGMENTS.map(s => (
                      <button key={s.key} onClick={() => setSegment(s.key)}
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
                          segment === s.key
                            ? s.key === "directed" ? "bg-[#efb43f]/20 text-[#efb43f]"
                              : s.key === "upcoming" ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-white/15 text-white"
                            : "text-white/40 hover:text-white/70"
                        )}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {currentCredits.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-white/30">No {segmentLabel.toLowerCase()} found</div>
                ) : (
                  <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-6 pb-6">
                    {currentCredits.map(credit => {
                      const mt: MediaType = credit.media_type === "tv" ? "tv" : "movie";
                      const dateStr = credit.release_date || credit.first_air_date || "";
                      const today2 = new Date().toISOString().slice(0, 10);
                      const isFuture = !dateStr || dateStr > today2;
                      const releaseYear = dateStr ? dateStr.slice(0, 4) : null;
                      return (
                        <motion.button
                          key={`${credit.id}-${mt}-${segment}`}
                          whileHover={{ y: -4, scale: 1.03 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => { onOpenItem({ ...credit, media_type: mt } as unknown as MediaItem, mt); onClose(); }}
                          className="group text-left"
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] bg-white/8 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                            {credit.poster_path
                              ? <img src={`${POSTER_BASE}${credit.poster_path}`} alt={credit.title || credit.name || ""} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                              : <div className="flex h-full w-full items-center justify-center"><Film size={20} className="text-white/20" /></div>}
                            {segment === "upcoming" && isFuture && (
                              <div className="absolute top-1.5 left-1.5 rounded-md bg-emerald-500 px-1.5 py-0.5">
                                <span className="text-[8px] font-black text-white uppercase tracking-wider">{releaseYear ?? "Soon"}</span>
                              </div>
                            )}
                            {segment === "directed" && (
                              <div className="absolute bottom-1.5 left-1 right-1 flex justify-center">
                                <span className="rounded-md bg-[#efb43f]/90 px-1.5 py-0.5 text-[7px] font-black text-black uppercase tracking-wider">Director</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <div className="truncate text-[11px] font-semibold text-white/75 group-hover:text-white">{credit.title || credit.name}</div>
                            <div className="flex items-center gap-1.5">
                              {credit.vote_average ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#f5c518]">
                                  <span className="rounded-[3px] bg-[#f5c518] px-1 py-0.5 text-[7px] font-black text-black">IMDb</span>
                                  {credit.vote_average.toFixed(1)}
                                </span>
                              ) : null}
                              {dateStr && <span className="text-[10px] text-white/30">{dateStr.slice(0, 4)}</span>}
                            </div>
                            {credit.character && segment !== "directed" && <div className="truncate text-[9px] text-white/30">{credit.character}</div>}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



// ── Episode Source Picker Modal ───────────────────────────────────────────────
function EpisodeSourcePickerModal({
  open,
  onClose,
  show,
  episode,
  onPlay,
}: {
  open: boolean;
  onClose: () => void;
  show: { title: string; posterPath: string | null; tmdbId: number; mediaType: MediaType };
  episode: { number: number; season: number; name: string; runtime?: number; airDate?: string; stillPath?: string | null } | null;
  onPlay: (payload: { url: string; title: string; mediaType: MediaType; tmdbId: number; season: number; episode: number }) => void;
}) {
  const [selectedServer, setSelectedServer] = useState<ServerKey>(() => {
    try { return (localStorage.getItem("gf_preferred_server") as ServerKey) || "superembed"; } catch { return "superembed"; }
  });
  const [rememberServer, setRememberServer] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !episode) return null;

  const thumbUrl = episode.stillPath
    ? `https://image.tmdb.org/t/p/w300${episode.stillPath}`
    : show.posterPath
    ? `https://image.tmdb.org/t/p/w342${show.posterPath}`
    : null;

  const handlePlay = () => {
    const server = SERVERS.find((s) => s.key === selectedServer) ?? SERVERS[0];
    const url = server.buildUrl({ type: show.mediaType, tmdbId: show.tmdbId, season: episode.season, episode: episode.number });
    if (rememberServer) { try { localStorage.setItem("gf_preferred_server", selectedServer); } catch {} }
    onPlay({ url, title: show.title, mediaType: show.mediaType, tmdbId: show.tmdbId, season: episode.season, episode: episode.number });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden border border-white/10 bg-[#0f1117] shadow-2xl"
        >
          {/* Episode header */}
          <div className="flex gap-3 p-4 border-b border-white/6">
            <div className="shrink-0 w-[90px] sm:w-[100px] aspect-video rounded-lg overflow-hidden bg-white/5">
              {thumbUrl ? (
                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={18} className="text-white/20" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-0.5">
                {show.title} · S{episode.season}E{episode.number}
              </div>
              <div className="text-[14px] font-bold text-white leading-snug line-clamp-2">{episode.name}</div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-white/30">
                {episode.runtime ? <span>{episode.runtime}m</span> : null}
                {episode.airDate ? <span>{episode.airDate}</span> : null}
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition active:scale-90">
              <X size={16} />
            </button>
          </div>

          {/* Server list */}
          <div className="p-3 max-h-[40vh] overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/25 px-1 mb-2">Choose a source</div>
            <div className="space-y-1">
              {SERVERS.map((server, i) => {
                const isSelected = selectedServer === server.key;
                const isDefault = i === 0;
                return (
                  <button
                    key={server.key}
                    onClick={() => setSelectedServer(server.key)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      isSelected
                        ? "bg-[#e50914]/10 border border-[#e50914]/30"
                        : "border border-transparent hover:border-white/8 hover:bg-white/[0.03]"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 shrink-0 transition",
                      isSelected ? "bg-[#e50914] border-[#e50914]" : "border-white/25"
                    )} />
                    <span className={cn("flex-1 text-[13px] font-semibold", isSelected ? "text-white" : "text-white/55")}>{server.label}</span>
                    <div className="flex gap-1 shrink-0">
                      {isDefault && <span className="px-1.5 py-0.5 rounded-md bg-[#e50914]/15 text-[#e50914] text-[9px] font-bold uppercase tracking-wide">Default</span>}
                      {server.badges?.map((b) => (
                        <span key={b} className="px-1.5 py-0.5 rounded-md bg-white/6 text-white/30 text-[9px] font-bold uppercase tracking-wide">{b}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/6 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberServer}
                onChange={(e) => setRememberServer(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#e50914]"
              />
              <span className="text-[11px] text-white/35">Remember my source choice</span>
            </label>
            <button
              onClick={handlePlay}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e50914] hover:bg-[#c4070f] py-3 text-[14px] font-bold text-white transition active:scale-[0.98]"
            >
              <Play size={14} className="fill-white" />
              Play Episode
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WatchModal({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: {
    url: string;
    title: string;
    mediaType: MediaType;
    tmdbId?: number;
    season?: number;
    episode?: number;
  } | null;
  onClose: () => void;
}) {
  const [selectedServer, setSelectedServer] = useState<ServerKey>(() => {
    try { return (localStorage.getItem("gf_preferred_server") as ServerKey) || "superembed"; } catch { return "superembed"; }
  });
  const [iframeKey, setIframeKey] = useState(0);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setServerMenuOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !payload?.tmdbId) return null;

  const buildUrlFor = (serverKey: ServerKey) => {
    const server = SERVERS.find((s) => s.key === serverKey) ?? SERVERS[0];
    return server.buildUrl({ type: payload.mediaType, tmdbId: payload.tmdbId!, season: payload.season, episode: payload.episode });
  };

  const switchServer = (serverKey: ServerKey) => {
    setSelectedServer(serverKey);
    setIframeKey((k) => k + 1);
    setServerMenuOpen(false);
    try { localStorage.setItem("gf_preferred_server", serverKey); } catch {}
  };

  const iframeSrc = buildUrlFor(selectedServer);
  const currentServerLabel = SERVERS.find((s) => s.key === selectedServer)?.label ?? "Server";
  const episodeLabel = payload.mediaType === "tv" && payload.season && payload.episode
    ? ` · S${payload.season}E${payload.episode}`
    : "";
  const displayTitle = `${payload.title}${episodeLabel}`;

  return (
    <AnimatePresence>
      <motion.div
        key="watch-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 sm:bg-black/80 sm:backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: IS_MOBILE ? 1 : 0.96, y: IS_MOBILE ? 0 : 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: IS_MOBILE ? 1 : 0.96 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex flex-col bg-[#0a0a0a] overflow-hidden",
            IS_MOBILE
              ? "fixed inset-0"
              : "w-[90vw] h-[90vh] max-w-[1400px] rounded-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
          )}
        >
          {/* ── Top bar ── */}
          <div className="relative z-10 flex shrink-0 items-center gap-3 bg-[#0a0a0a]/95 px-3 py-2.5 sm:px-4 border-b border-white/[0.07]">
            {/* Title */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white/90 sm:text-[14px]">{displayTitle}</p>
            </div>

            {/* Server switcher */}
            <div className="relative shrink-0">
              <button
                onClick={() => setServerMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white/90"
              >
                <span className="hidden sm:inline max-w-[120px] truncate">{currentServerLabel}</span>
                <span className="sm:hidden">Source</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {serverMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-2xl"
                  >
                    <div className="max-h-[280px] overflow-y-auto py-1">
                      {SERVERS.map((server, i) => (
                        <button
                          key={server.key}
                          onClick={() => switchServer(server.key)}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition",
                            selectedServer === server.key
                              ? "bg-[#efb43f]/10 text-[#efb43f]"
                              : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            selectedServer === server.key ? "bg-[#efb43f]" : "bg-white/20"
                          )} />
                          <span className="flex-1 truncate font-medium">{server.label}</span>
                          {i === 0 && <span className="shrink-0 rounded-md bg-white/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/35">Default</span>}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Open in new tab fallback */}
            <button
              onClick={() => window.open(iframeSrc, "_blank", "noopener,noreferrer")}
              title="Open in new tab"
              className="shrink-0 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-medium text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="hidden sm:inline">New Tab</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/12 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── iframe ── */}
          <div className="relative flex-1 bg-black" onClick={() => serverMenuOpen && setServerMenuOpen(false)}>
            <iframe
              key={iframeKey}
              src={iframeSrc}
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════
//  ANIMATED STATE ICONS
// ══════════════════════════════════════════════════════════════
function useAutoToggle(interval: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), interval);
    return () => clearInterval(id);
  }, [interval]);
  return on;
}

function AnimBookmark({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <motion.svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}
      animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}>
      <motion.path d="M5 3h14a1 1 0 011 1v17l-7-3.5L6 21V4a1 1 0 011-1z"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        animate={active ? { fill: "currentColor", opacity: 1 } : { fill: "transparent", opacity: 0.7 }}
        transition={{ duration: 0.25 }} />
    </motion.svg>
  );
}

function AnimEye({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
      <motion.path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
        animate={active ? { opacity: 1 } : { opacity: 0.5 }}
        transition={{ duration: 0.25 }} />
      <motion.circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.8}
        animate={active ? { scale: 1, opacity: 1, fill: "currentColor" } : { scale: 0.7, opacity: 0.4, fill: "transparent" }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} />
      <AnimatePresence>
        {!active && (
          <motion.line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} />
        )}
      </AnimatePresence>
    </svg>
  );
}

function AnimStar({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <motion.svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}
      animate={active ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
      <motion.polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        animate={active ? { fill: "#efb43f", stroke: "#efb43f" } : { fill: "transparent", stroke: "currentColor" }}
        transition={{ duration: 0.25 }} />
    </motion.svg>
  );
}

function AnimCheck({ active, size = 16 }: { active: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
      <motion.circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.8}
        animate={active ? { stroke: "#34d399", opacity: 1 } : { stroke: "currentColor", opacity: 0.4 }}
        transition={{ duration: 0.2 }} />
      <AnimatePresence>
        {active && (
          <motion.path d="M8 12l3 3 5-5" stroke="#34d399" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
            transition={{ duration: 0.3 }} />
        )}
      </AnimatePresence>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
//  GOODFILM FOOTER
// ══════════════════════════════════════════════════════════════
function GoodFilmFooter() {
  const footerCols = [
    {
      label: "Discover",
      links: [
        { title: "Trending Movies" },
        { title: "Top Rated TV" },
        { title: "Coming Soon" },
        { title: "Fan Favorites" },
      ],
    },
    {
      label: "Your Library",
      links: [
        { title: "Watchlist" },
        { title: "Watched History" },
        { title: "Ratings" },
        { title: "My Lists" },
      ],
    },
    {
      label: "Support",
      links: [
        { title: "Help Center" },
        { title: "Privacy Policy" },
        { title: "Terms of Service" },
        { title: "Contact Us" },
      ],
    },
    {
      label: "Follow Us",
      links: [
        { title: "X / Twitter",  icon: "x" },
        { title: "Instagram",    icon: "ig" },
        { title: "YouTube",      icon: "yt" },
        { title: "LinkedIn",     icon: "li" },
      ],
    },
  ];

  const SocialIcon = ({ type }: { type: string }) => {
    if (type === "x") return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.26 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
    if (type === "ig") return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    );
    if (type === "yt") return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
      </svg>
    );
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
      </svg>
    );
  };

  return (
    <footer className="relative mt-16 border-t border-white/6 bg-[#07080d]">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#efb43f]/30 to-transparent" />
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_50%_60px_at_50%_0%,rgba(239,180,63,0.06),transparent)]" />

      <div className="mx-auto max-w-[1340px] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-12">

          {/* Brand col */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f]">
                <Film size={14} className="text-black" />
              </div>
              <span className="text-[16px] font-black tracking-[-0.03em] text-white">GoodFilm</span>
            </div>
            <p className="text-[12px] leading-[1.8] text-white/35 max-w-[200px]">
              Track what you watch. Discover what's next.
            </p>
            <p className="mt-4 text-[11px] text-white/20">
              © {new Date().getFullYear()} GoodFilm. All rights reserved.
            </p>
          </motion.div>

          {/* Link cols */}
          {footerCols.map((col, idx) => (
            <motion.div key={col.label}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.08 * (idx + 1) }}>
              <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{col.label}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.title}>
                    <a href="#" className="group flex items-center gap-2 text-[12px] text-white/45 transition hover:text-white/80">
                      {"icon" in link && link.icon && (
                        <span className="text-white/30 transition group-hover:text-[#efb43f]">
                          <SocialIcon type={link.icon as string} />
                        </span>
                      )}
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 sm:mt-12 sm:flex-row sm:pt-8 sm:gap-4">
          <p className="text-[11px] text-white/25">Powered by TMDB · IMDb · OMDb</p>
          <div className="flex items-center gap-4">
            {["Privacy", "Terms", "Cookies"].map(label => (
              <a key={label} href="#" className="text-[11px] text-white/25 transition hover:text-white/50">{label}</a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}


function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="min-h-screen overflow-x-hidden bg-[#07080d] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(239,180,63,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_50%,rgba(14,30,65,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_80%,rgba(14,30,65,0.18),transparent_60%)]" />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '256px' }} />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function SettingsPanel({
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

  const cloudColor = cloudMode === "ready" ? "text-emerald-400" : cloudMode === "missing_table" ? "text-amber-400" : "text-white/30";
  const cloudLabel = cloudMode === "ready" ? "Cloud sync active" : cloudMode === "missing_table" ? "Cloud table missing" : currentUser ? "Checking sync..." : "Not syncing";

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
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-white/35 transition hover:bg-white/8 hover:text-white/70 active:scale-90">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efb43f]/15 text-[14px] font-bold text-[#efb43f]">
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
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-[#efb43f] h-11 text-[14px] font-bold text-black transition hover:brightness-110"
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
                  <div className="text-[11px] text-white/45 mb-2">Run setup SQL in Supabase SQL Editor, then reload.</div>
                  <button
                    onClick={() => navigator.clipboard.writeText(CLOUD_SETUP_SQL)}
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Copy setup SQL
                  </button>
                </div>
              )}

              <label className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white">
                <Download size={16} className="text-emerald-400" />
                <span>Import Library</span>
                <span className="ml-auto text-[10px] font-semibold text-white/25">JSON</span>
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { onImport(file); onClose(); }
                  e.target.value = "";
                }} />
              </label>

              <button
                onClick={() => { onExport(); onClose(); }}
                className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[14px] text-white/80 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Upload size={16} className="text-blue-400" />
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


function TopPillNav({
  activeTab,
  setActiveTab,
  search,
  setSearch,
  onOpenProfile,
  appLanguage,
  searchResults,
  searchLoading,
  searchError,
  onOpenResult,
  currentUser,
  userProfile,
  library,
  onLogout,
  searchOpenOverride,
  onSearchOpenChange,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  search: string;
  setSearch: (value: string) => void;
  onOpenProfile: (view?: "profile" | "settings", anchorTop?: number) => void;
  appLanguage: AppLanguage;
  searchResults: MediaItem[];
  searchLoading: boolean;
  searchError: string | null;
  onOpenResult: (item: MediaItem, mediaType: MediaType) => void;
  currentUser: CloudUser | null;
  userProfile: UserProfile | null;
  library: UserLibrary;
  onLogout: () => void;
  searchOpenOverride?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}) {
  const [isSearchOpenInternal, setIsSearchOpenInternal] = useState(false);
  const isSearchOpen = searchOpenOverride !== undefined ? searchOpenOverride : isSearchOpenInternal;
  const setIsSearchOpen = (open: boolean) => {
    setIsSearchOpenInternal(open);
    onSearchOpenChange?.(open);
  };
  const [searchFilter, setSearchFilter] = useState<"all" | "movie" | "tv" | "anime">("all");
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const userBtnRef = React.useRef<HTMLButtonElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showUserPopover) return;
    const h = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          userBtnRef.current && !userBtnRef.current.contains(e.target as Node)) {
        setShowUserPopover(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showUserPopover]);

  const filteredSearchResults = useMemo(() => {
    if (searchFilter === "all") return searchResults;
    if (searchFilter === "movie") return searchResults.filter((result) => (result.media_type || (result.first_air_date ? "tv" : "movie")) === "movie");
    if (searchFilter === "tv") return searchResults.filter((result) => (result.media_type || (result.first_air_date ? "tv" : "movie")) === "tv");
    return searchResults.filter((result) => {
      const type = result.media_type || (result.first_air_date ? "tv" : "movie");
      const genres = result.genre_ids || [];
      const isAnimation = genres.includes(16);
      const hasJapaneseSignals = /anime|japan|japanese/i.test(`${result.title || ""} ${result.name || ""} ${result.overview || ""}`);
      return isAnimation || (type === "tv" && hasJapaneseSignals);
    });
  }, [searchResults, searchFilter]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [] as Array<{ label: string; item: MediaItem; type: MediaType }>;

    return searchResults
      .map((result) => {
        const label = getTitle(result);
        const lower = label.toLowerCase();
        const type: MediaType = result.media_type || (result.first_air_date ? "tv" : "movie");
        let score = 0;

        if (lower === q) score += 120;
        if (lower.startsWith(q)) score += 80;
        if (lower.includes(q)) score += 45;
        if (lower.split(" ").some((word) => word.startsWith(q))) score += 20;
        score += Math.max(0, 20 - Math.abs(lower.length - q.length));
        score += Math.round(result.vote_average || 0);

        return { label, item: result, type, score };
      })
      .sort((a, b) => b.score - a.score)
      .filter((entry, index, arr) => arr.findIndex((x) => x.label.toLowerCase() === entry.label.toLowerCase() && x.type === entry.type) === index)
      .slice(0, 6);
  }, [search, searchResults]);

  const items = [
    { key: "home"   as Tab, label: tr(appLanguage, "home"),    icon: Home       },
    { key: "movies" as Tab, label: tr(appLanguage, "movies"),  icon: Film       },
    { key: "series" as Tab, label: tr(appLanguage, "tvShows"), icon: Tv         },
    { key: "anime"  as Tab, label: "Anime",                    icon: Sparkles   },
    { key: "lists"  as Tab, label: "Lists",                    icon: LayoutList },
  ];
  // "profile" tab is accessible via the user icon — not shown in main nav items
  // but we detect it to highlight the user avatar when on profile tab

  return (
    <>
      {/* ── Cinematic top nav — desktop only (md+); mobile uses MobileTopBar ── */}
      <header className="sticky top-0 z-40 w-full bg-[#07080d]/90 backdrop-blur-xl hidden md:block" style={{ isolation: "isolate" }}>
        {/* Bottom border line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />

        <div className="relative flex items-center justify-between px-4 py-4 md:px-10 lg:px-14">

          {/* ── LEFT: Logo ── */}
          <Link
            to="/"
            onClick={() => { setActiveTab("home"); setIsSearchOpen(false); setSearch(""); setMobileMenuOpen(false); }}
            className="flex items-center gap-2 shrink-0 opacity-90 hover:opacity-100 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f]">
              <Film size={14} className="text-black" />
            </div>
            <span className="text-[16px] font-black tracking-[-0.04em] text-white">GoodFilm</span>
          </Link>

          {/* ── CENTER: Nav links — hidden on mobile, visible md+ ── */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeTab;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setIsSearchOpen(false); setSearch(""); }}
                  whileTap={{ scale: 0.97 }}
                  className="relative px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors"
                >
                  <span className={cn("transition-colors duration-200", active ? "text-white" : "text-white/45 hover:text-white/80")}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div layoutId="nav-underline" className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#efb43f]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* ── RIGHT: Search + User + Hamburger ── */}
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => { setSearchFilter("all"); setIsSearchOpen(true); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:text-white"
              aria-label="Search"
            >
              <Search size={15} />
            </motion.button>

            {/* User popover trigger */}
            <div className="relative">
              <motion.button
                ref={userBtnRef}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                onClick={() => setShowUserPopover(v => !v)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition",
                  activeTab === "profile"
                    ? "border-[#efb43f] bg-[#efb43f]/20 text-[#efb43f] ring-1 ring-[#efb43f]/30"
                    : currentUser
                    ? "border-[#efb43f]/30 bg-[#efb43f]/10 text-[#efb43f]"
                    : "border-white/10 bg-white/[0.04] text-white/60 hover:border-[#efb43f]/40 hover:text-[#efb43f]"
                )}
                aria-label="Profile"
              >
                {currentUser && userProfile ? (
                  <span className="text-[11px] font-black">{(userProfile.username || currentUser.email || "U").slice(0,1).toUpperCase()}</span>
                ) : (
                  <User size={15} />
                )}
              </motion.button>

              {/* Popover */}
              <AnimatePresence>
                {showUserPopover && (
                  <motion.div
                    ref={popoverRef}
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-11 z-[60] w-[240px] overflow-hidden rounded-[16px] border border-white/10 bg-[#0e0f18] shadow-[0_16px_48px_rgba(0,0,0,0.7)] max-h-[80svh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    {currentUser && userProfile ? (
                      <>
                        {/* Header */}
                        <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#efb43f] to-[#c97d0a] text-[15px] font-black text-black">
                            {userProfile.avatarUrl
                              ? <img src={userProfile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                              : (userProfile.username || currentUser.email || "U").slice(0,1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold text-white">{userProfile.username}</div>
                            <div className="truncate text-[10px] text-white/40">{currentUser.email}</div>
                          </div>
                        </div>

                        {/* Stats strip */}
                        <div className="flex divide-x divide-white/6 border-b border-white/6">
                          {[
                            { v: library.watched.length, l: "Watched", icon: AnimEye },
                            { v: library.watchlist.length, l: "List", icon: AnimBookmark },
                            { v: Object.keys(library.ratings||{}).length, l: "Rated", icon: AnimStar },
                          ].map(({ v, l, icon: Icon }) => (
                            <div key={l} className="flex flex-1 flex-col items-center py-2.5">
                              <div className="text-[16px] font-black text-white leading-none">{v}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-white/35">
                                <Icon active={v > 0} size={10} />
                                {l}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="p-1.5 space-y-0.5">
                          <button onClick={() => { setShowUserPopover(false); onOpenProfile("profile"); }}
                            className={cn("flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold transition hover:bg-white/[0.06]",
                              activeTab === "profile" ? "bg-white/[0.08] text-white" : "text-white/70 hover:text-white")}>
                            <User size={13} className={activeTab === "profile" ? "text-[#efb43f]" : "text-white/40"} />
                            View Profile
                            {activeTab === "profile" && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#efb43f]" />}
                          </button>
                          <button onClick={() => { setShowUserPopover(false); onOpenProfile("settings"); }}
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white">
                            <Settings size={13} className="text-white/40" /> Settings
                          </button>
                          <div className="my-1 border-t border-white/6" />
                          <button onClick={() => { setShowUserPopover(false); onLogout(); }}
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12px] font-semibold text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400">
                            <LogOut size={13} /> Sign Out
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Signed out state */
                      <div className="p-4 text-center space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] mx-auto">
                          <User size={20} className="text-white/40" />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-white">Sign in to sync</div>
                          <div className="text-[11px] text-white/35 mt-0.5">Save your list across devices</div>
                        </div>
                        <button onClick={() => { setShowUserPopover(false); onOpenProfile("profile"); }}
                          className="w-full rounded-[10px] bg-[#efb43f] py-2.5 text-[12px] font-bold text-black transition hover:brightness-110">
                          Sign In / Sign Up
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* ── Hamburger — mobile only ── */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen
                ? <X size={15} />
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
            </button>
          </div>
        </div>

        {/* ── Mobile nav drawer ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/6 md:hidden"
            >
              <div className="flex flex-col px-4 py-2">
                {items.map((navItem) => {
                  const Icon = navItem.icon;
                  const active = navItem.key === activeTab;
                  return (
                    <button key={navItem.key}
                      onClick={() => { setActiveTab(navItem.key); setMobileMenuOpen(false); setIsSearchOpen(false); setSearch(""); }}
                      className={cn("flex items-center gap-3 rounded-[10px] px-3 py-3 text-[14px] font-semibold transition",
                        active ? "bg-white/8 text-white" : "text-white/50 hover:text-white"
                      )}>
                      <Icon size={15} className={active ? "text-[#efb43f]" : "text-white/30"} />
                      {navItem.label}
                      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#efb43f]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {isSearchOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-50",
              IS_MOBILE ? "bg-[#07080d]" : "bg-black/60 backdrop-blur-md"
            )}
            onClick={IS_MOBILE ? undefined : () => {
              setIsSearchOpen(false);
              setSearch("");
              setSearchFilter("all");
            }}
          >
            <motion.div
              initial={IS_MOBILE ? { x: "100%" } : { opacity: 0, y: -20 }}
              animate={IS_MOBILE ? { x: 0 } : { opacity: 1, y: 0 }}
              exit={IS_MOBILE ? { x: "100%" } : { opacity: 0, y: -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                IS_MOBILE
                  ? "fixed inset-0 flex flex-col bg-[#07080d]"
                  : "mx-auto mt-16 w-[calc(100vw-24px)] max-w-[680px] overflow-hidden rounded-[16px] border border-white/8 bg-[#0a0c12]/98 shadow-[0_32px_80px_rgba(0,0,0,0.6)] sm:mt-20 sm:w-[calc(100vw-32px)] sm:rounded-[20px]"
              )}
            >
              <div className={cn(
                "flex items-center gap-2.5 border-b border-white/8 px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4",
                IS_MOBILE && "pt-[calc(env(safe-area-inset-top,0px)+12px)]"
              )}>
                {IS_MOBILE ? (
                  <button
                    onClick={() => { setIsSearchOpen(false); setSearch(""); setSearchFilter("all"); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition active:bg-white/10"
                  >
                    <ChevronLeft size={20} />
                  </button>
                ) : (
                  <Search size={18} className="text-white/52" />
                )}
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr(appLanguage, "search")}
                  className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/32"
                />
                <button
                  onClick={() => {
                    setSearch("");
                    setIsSearchOpen(false);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              {searchSuggestions.length ? (
                <div className="border-b border-white/8 px-5 py-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/36">
                    Suggestions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.map((entry) => (
                      <button
                        key={`${entry.type}-${entry.item.id}`}
                        onClick={() => setSearch(entry.label)}
                        className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/74 transition hover:bg-white/[0.1] hover:text-white"
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="border-b border-white/8 px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "movie", label: "Movies" },
                    { key: "tv", label: "Series" },
                    { key: "anime", label: "Anime" },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSearchFilter(filter.key as "all" | "movie" | "tv" | "anime")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        searchFilter === filter.key ? "bg-[#efb43f] text-black font-bold" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={cn("overflow-y-auto px-5 py-4", IS_MOBILE ? "flex-1" : "max-h-[70vh]")}>
                {!search.trim() ? (
                  <div className="text-sm text-white/48">
                    Start typing to search movies and TV shows.
                  </div>
                ) : searchLoading ? (
                  <div className="text-sm text-white/48">
                    Searching...
                  </div>
                ) : searchError ? (
                  <div className="text-sm text-red-300">
                    {searchError}
                  </div>
                ) : filteredSearchResults.length ? (
                  <div className="space-y-3">
                    {filteredSearchResults.slice(0, 12).map((result) => {
                      const type: MediaType = result.media_type || (result.first_air_date ? "tv" : "movie");

                      return (
                        <button
                          key={`${type}-${result.id}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearch("");
                            setActiveTab(type === "movie" ? "movies" : "series");
                            onOpenResult(result, type);
                          }}
                          className="flex w-full items-center gap-4 rounded-2xl bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                        >
                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-[#151515]">
                            {result.backdrop_path || result.poster_path ? (
                              <img
                                src={`${BACKDROP_BASE}${result.backdrop_path || result.poster_path}`}
                                alt={getTitle(result)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/34">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {getTitle(result)}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                              {type === "movie" ? "Movie" : "Series"} • {getYear(result)}
                            </div>
                            {result.overview ? (
                              <div className="mt-1 line-clamp-2 text-xs text-white/42">
                                {result.overview}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/48">
                    No results found.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ── Genre-driven colour themes ──────────────────────────────────────────────
const HERO_GENRE_THEMES: Record<number, { bg1: string; bg2: string; accent: string; btnBg: string; btnShadow: string }> = {
  28:   { bg1:"#2a0a00", bg2:"#160400", accent:"#ff6030", btnBg:"#d45020", btnShadow:"rgba(212,80,32,0.55)"  }, // Action
  12:   { bg1:"#001a0a", bg2:"#000d05", accent:"#00d964", btnBg:"#00b050", btnShadow:"rgba(0,176,80,0.55)"   }, // Adventure
  16:   { bg1:"#001c1c", bg2:"#000e0e", accent:"#00e5e5", btnBg:"#00acc1", btnShadow:"rgba(0,172,193,0.55)"  }, // Animation
  35:   { bg1:"#201400", bg2:"#120a00", accent:"#ffd600", btnBg:"#f9a825", btnShadow:"rgba(249,168,37,0.55)" }, // Comedy
  80:   { bg1:"#280000", bg2:"#140000", accent:"#ff1a1a", btnBg:"#b71c1c", btnShadow:"rgba(183,28,28,0.55)"  }, // Crime
  18:   { bg1:"#080818", bg2:"#04040e", accent:"#7c83e0", btnBg:"#5c6bc0", btnShadow:"rgba(92,107,192,0.55)" }, // Drama
  14:   { bg1:"#001020", bg2:"#000810", accent:"#40a0ff", btnBg:"#1565c0", btnShadow:"rgba(21,101,192,0.55)" }, // Fantasy
  27:   { bg1:"#130018", bg2:"#08000e", accent:"#b040e0", btnBg:"#7b1fa2", btnShadow:"rgba(123,31,162,0.55)" }, // Horror
  9648: { bg1:"#00101a", bg2:"#000810", accent:"#00aaff", btnBg:"#0277bd", btnShadow:"rgba(2,119,189,0.55)"  }, // Mystery
  10749:{ bg1:"#220010", bg2:"#120008", accent:"#f06292", btnBg:"#c2185b", btnShadow:"rgba(194,24,91,0.55)"  }, // Romance
  878:  { bg1:"#000820", bg2:"#000410", accent:"#40c4ff", btnBg:"#0288d1", btnShadow:"rgba(2,136,209,0.55)"  }, // Sci-Fi
  53:   { bg1:"#200c00", bg2:"#100600", accent:"#ff9800", btnBg:"#e65100", btnShadow:"rgba(230,81,0,0.55)"   }, // Thriller
};
const HERO_DEFAULT_THEME = { bg1:"#1a0000", bg2:"#0a0000", accent:"#00e676", btnBg:"#00c853", btnShadow:"rgba(0,200,83,0.55)" };

function Hero({
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

  // Inject Google display font once
  useEffect(() => {
    if (document.getElementById("hero-display-font")) return;
    const link = document.createElement("link");
    link.id   = "hero-display-font";
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Creepster&family=Bebas+Neue&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => { setHeroIndex(0); }, [sourceItems.length, sourceItems[0]?.id]);

  // Auto-rotate hero every 9 s
  useEffect(() => {
    if (sourceItems.length <= 1) return;
    const t = window.setInterval(() => setHeroIndex(p => (p + 1) % sourceItems.length), 9000);
    return () => window.clearInterval(t);
  }, [sourceItems.length]);

  // Trailer key
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

  // OMDB ratings
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
  // High-res poster for the right-side character image
  const charImg   = item.poster_path
    ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
    : backdrop;

  const GENRES: Record<number, string> = { 28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",53:"Thriller",10752:"War",37:"Western",10759:"Action & Adventure",10765:"Sci-Fi & Fantasy" };
  const genres    = (item.genre_ids || []).slice(0, 4).map(id => GENRES[id]).filter(Boolean);
  const year      = getYear(item);
  const isTv      = mediaType === "tv";
  const subtitle  = isTv ? "Season 1" : year ? `${year}` : "";
  const rating    = item.vote_average || 0;
  const starCount = Math.round(rating / 2);      // 0–5
  const imdbLabel = omdbData.imdb || (rating > 0 ? rating.toFixed(1) : null);

  // Dynamic theme from primary genre
  const primaryGid = (item.genre_ids || [])[0];
  const theme = HERO_GENRE_THEMES[primaryGid] ?? HERO_DEFAULT_THEME;

  // 5-card centered carousel window
  const n       = sourceItems.length;
  const VISIBLE = Math.min(5, n);
  const half    = Math.floor(VISIBLE / 2);
  const carouselIndices = Array.from({ length: VISIBLE }, (_, i) => (heroIndex - half + i + n) % n);

  return (
    <section
      className="relative w-full overflow-hidden cursor-pointer"
      onClick={() => onOpen(item, mediaType)}
      style={{
        height: "clamp(560px, 84vh, 940px)",
        background: `radial-gradient(ellipse 90% 75% at 62% 38%, ${theme.bg1} 0%, ${theme.bg2} 48%, #000 100%)`,
        // No CSS background transition — gradient transitions force full repaints on every zoom frame
        contain: "layout style",
      }}
    >
      {/* ── Blurred backdrop tint layer — reinforces palette ── */}
      {USE_SIMPLE_ANIMATIONS ? (
        <div
          className="absolute inset-0 z-[0]"
          style={{ filter: "blur(72px) saturate(1.6)", opacity: 0.22 }}
        >
          {backdrop && <img src={backdrop} alt="" className="h-full w-full object-cover" />}
        </div>
      ) : (
        <AnimatePresence mode="sync">
          <motion.div
            key={`bgtint-${heroIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1 }}
            className="absolute inset-0 z-[0]"
            style={{ filter: "blur(72px) saturate(1.6)" }}
          >
            {backdrop && <img src={backdrop} alt="" className="h-full w-full object-cover" />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Film grain — desktop only ── */}
      {!IS_MOBILE && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.032] mix-blend-screen"
          style={{
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)'/%3E%3C/svg%3E")`,
            backgroundRepeat:"repeat", backgroundSize:"160px 160px",
          }}
        />
      )}

      {/* ── RIGHT: Character image — fades into background on left & bottom ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`char-${heroIndex}`}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-y-0 right-0 z-[2] hidden w-[58%] md:block lg:w-[54%]"
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

      {/* ── Hard left curtain — keeps text area pitch black on any image ── */}
      <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(90deg,rgba(0,0,0,1)_0%,rgba(0,0,0,.97)_28%,rgba(0,0,0,.72)_46%,rgba(0,0,0,.12)_66%,transparent_100%)]" />
      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-32 bg-gradient-to-b from-black/55 to-transparent" />
      {/* Bottom gradient — dark shelf for the carousel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-64 bg-gradient-to-t from-black via-black/88 to-transparent" />

      {/* ── LEFT: Information block ── */}
      <div className="absolute inset-0 z-[4] flex flex-col justify-center overflow-hidden pb-40 pt-20 pl-6 sm:pl-10 md:pl-14 lg:pl-20 sm:pt-24 md:pt-28">
        <motion.div
          key={`info-${heroIndex}`}
          initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0, y: 16 }}
          animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1, y: 0 }}
          transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-[min(480px,56%)] flex-col items-start text-left"
        >

          {/* Title — display / horror font */}
          <motion.h1
            key={`title-${heroIndex}`}
            initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0, y: -10 }}
            animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1, y: 0 }}
            transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.5, delay: 0.06 }}
            className="mb-1 line-clamp-2 leading-[0.95] uppercase tracking-wide"
            style={{
              fontFamily: "'Creepster', 'Bebas Neue', 'Impact', cursive",
              fontSize: "clamp(36px, 5.5vw, 76px)",
              color: theme.accent,
              textShadow: `0 0 48px ${theme.accent}50, 0 3px 10px rgba(0,0,0,.95)`,
            }}
          >
            {getTitle(item)}
          </motion.h1>

          {/* Season / Year subtitle */}
          {subtitle && (
            <motion.p
              initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0 }}
              animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1 }}
              transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.4, delay: 0.12 }}
              className="mb-3 text-[16px] font-semibold text-white/75 sm:text-[18px]"
            >
              {subtitle}
            </motion.p>
          )}

          {/* 5-star rating */}
          <motion.div
            initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0 }}
            animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1 }}
            transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.4, delay: 0.18 }}
            className="mb-3 flex items-center gap-1"
          >
            {[1,2,3,4,5].map(i => (
              <Star
                key={i} size={18}
                className={i <= starCount ? "fill-[#ffd700] text-[#ffd700]" : "fill-white/15 text-white/15"}
              />
            ))}
            {imdbLabel && (
              <span className="ml-2 text-[12px] text-white/38">{imdbLabel} / 10</span>
            )}
          </motion.div>

          {/* Genres with pipe separators */}
          {genres.length > 0 && (
            <motion.div
              initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0 }}
              animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1 }}
              transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.4, delay: 0.24 }}
              className="mb-5 flex flex-wrap items-center"
            >
              {genres.map((g, i) => (
                <React.Fragment key={g}>
                  {i > 0 && <span className="mx-2.5 select-none text-[14px] text-white/25">|</span>}
                  <span className="text-[13px] font-medium text-white/62">{g}</span>
                </React.Fragment>
              ))}
            </motion.div>
          )}

          {/* Overview */}
          {item.overview && (
            <motion.p
              initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0 }}
              animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1 }}
              transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.4, delay: 0.30 }}
              className="mb-7 max-w-[350px] text-[13px] leading-[1.82] text-white/48 md:text-[13.5px]"
            >
              {item.overview.slice(0, 145)}{item.overview.length > 145 ? "…" : ""}
            </motion.p>
          )}

          {/* Pill buttons */}
          <motion.div
            initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0, y: 8 }}
            animate={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 1, y: 0 }}
            transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.4, delay: 0.38 }}
            className="flex items-center gap-3"
          >
            {/* Primary pill — theme colour + play icon + first genre */}
            <motion.button
              whileHover={{ scale: 1.06, filter: "brightness(1.12)" }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onOpen(item, mediaType); }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-[10px] text-[13px] font-bold text-white transition"
              style={{ background: theme.btnBg, boxShadow: `0 4px 28px ${theme.btnShadow}` }}
            >
              <Play size={13} className="fill-white shrink-0" />
              {genres[0] ?? "Watch"}
            </motion.button>

            {/* Secondary outline pill — Trailer */}
            <motion.button
              whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.09)" }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                trailerKey
                  ? window.open(`https://www.youtube.com/watch?v=${trailerKey}`, "_blank")
                  : onOpen(item, mediaType);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/38 bg-transparent px-5 py-[10px] text-[13px] font-semibold text-white/80 backdrop-blur-sm transition hover:border-white/60 hover:text-white"
            >
              Trailer
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── BOTTOM-CENTER: Poster carousel — 5 cards, active has green border ── */}
      <div className="absolute bottom-0 inset-x-0 z-[5] flex flex-col items-center pb-5">
        <div className="flex items-end justify-center gap-3 px-4">
          <AnimatePresence mode="popLayout">
            {carouselIndices.map((idx, pos) => {
              const entry    = sourceItems[idx];
              const isActive = idx === heroIndex;
              const dist     = Math.abs(pos - half);          // 0 = center, 1 = adjacent, 2 = outer
              // Progressive card sizes: center largest, outer smallest
              const sizes = [
                { h: 62, w: 44 },   // outer
                { h: 82, w: 57 },   // adjacent
                { h: 128, w: 88 },  // active / center
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
                  layout={false}
                  initial={USE_SIMPLE_ANIMATIONS ? false : { opacity: 0, scale: 0.82 }}
                  animate={USE_SIMPLE_ANIMATIONS ? { opacity } : { opacity, scale: 1 }}
                  exit={USE_SIMPLE_ANIMATIONS ? undefined : { opacity: 0, scale: 0.82 }}
                  whileHover={USE_SIMPLE_ANIMATIONS || isActive || IS_MOBILE ? undefined : { scale: 1.12, opacity: 0.92, y: -6 }}
                  transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.3, delay: pos * 0.04 }}
                  onClick={(e) => { e.stopPropagation(); setHeroIndex(idx); }}
                  style={{
                    width: w, height: h,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: isActive
                      ? "3px solid #00ff41"
                      : "2px solid rgba(255,255,255,0.07)",
                    boxShadow: isActive
                      ? "0 0 22px rgba(0,255,65,0.55), 0 8px 32px rgba(0,0,0,.85)"
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



function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="h-5 w-[3px] rounded-full bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
      <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">{title}</h2>
    </div>
  );
}

const PosterCard = React.memo(function PosterCard({
  item,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  inWatchlist,
  inWatched,
  size = "default",
}: {
  item: MediaItem | LibraryItem;
  mediaType: MediaType;
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  inWatchlist: boolean;
  inWatched: boolean;
  userRating?: number;
  size?: "default" | "large" | "grid";
}) {
  const title = "mediaType" in item ? item.title : getTitle(item);
  const posterPath = "mediaType" in item ? item.posterPath : item.poster_path;
  const backdropPath = "mediaType" in item ? item.backdropPath : item.backdrop_path;
  const cardImage = backdropPath || posterPath;
  const year = "mediaType" in item ? item.year : getYear(item);
  const rating = "rating" in item ? item.rating : item.vote_average;
  const [logoData, setLogoData] = useState<{ path: string | null; width: number; height: number }>({ path: null, width: 0, height: 0 });
  const [glowColor, setGlowColor] = useState<string>("rgba(239,180,63,0.0)");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLogoData({ path: null, width: 0, height: 0 });
    fetchTMDBLogoPath(mediaType, item.id).then((data) => { if (!cancelled) setLogoData(data); });
    return () => { cancelled = true; };
  }, [mediaType, item.id]);

  // Extract color from poster for glow effect — skip on mobile for perf
  useEffect(() => {
    if (IS_MOBILE) return;
    const imgSrc = posterPath || backdropPath;
    if (!imgSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc?.startsWith("http") ? imgSrc : `${POSTER_BASE}${imgSrc}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 4, 4);
        const d = ctx.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        if (n) setGlowColor(`rgba(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)},0.55)`);
      } catch {}
    };
  }, [posterPath, backdropPath]);

  const sizeClasses =
    size === "large"
      ? "w-[240px] min-w-[240px] md:w-[280px] md:min-w-[280px] lg:w-[320px] lg:min-w-[320px]"
      : size === "grid"
        ? "w-full min-w-0"
        : "w-[160px] min-w-[160px] sm:w-[190px] sm:min-w-[190px] lg:w-[220px] lg:min-w-[220px]";

  return (
    <motion.div
      onHoverStart={USE_SIMPLE_ANIMATIONS ? undefined : () => setHovered(true)}
      onHoverEnd={USE_SIMPLE_ANIMATIONS ? undefined : () => setHovered(false)}
      whileHover={USE_SIMPLE_ANIMATIONS ? undefined : { y: -5, scale: 1.02 }}
      transition={USE_SIMPLE_ANIMATIONS ? undefined : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative cursor-pointer snap-start", sizeClasses)}
    >
      {/* Color glow shadow under card — desktop only */}
      {!IS_MOBILE && (
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute -inset-2 -z-10 rounded-[22px] blur-xl"
          style={{ background: glowColor }}
        />
      )}

      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[14px] bg-[#0d0f14] shadow-[0_8px_28px_rgba(0,0,0,0.5)]">
          {/* Image */}
          {cardImage ? (
            <img
              src={cardImage?.startsWith("http") ? cardImage : `${(backdropPath || !posterPath) ? BACKDROP_BASE : POSTER_BASE}${cardImage}`}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.07]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0d0f14]">
              <Film size={24} className="text-white/10" />
            </div>
          )}

          {/* Cinematic dark gradient */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_35%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.92)_100%)]" />

          {/* Hover border glow — desktop only */}
          {!IS_MOBILE && (
            <motion.div
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset"
              style={{ boxShadow: `inset 0 0 0 1px ${glowColor}` }}
            />
          )}

          {/* Rating badge — top left */}
          {rating && Number(rating) > 0 && (
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-sm bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
              <Star size={9} className="fill-[#efb43f] text-[#efb43f]" />
              <span className="text-[10px] font-bold text-white">{Number(rating).toFixed(1)}</span>
            </div>
          )}

          {/* Status buttons — always visible for reliable touch access */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
              className={cn(
                "pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
                inWatchlist ? "bg-[#efb43f] shadow-[0_2px_10px_rgba(239,180,63,0.5)]" : "bg-black/65 hover:bg-[#efb43f]"
              )}
            >
              <Bookmark size={12} className={inWatchlist ? "fill-black text-black" : "text-white"} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
              className={cn(
                "pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
                inWatched ? "bg-white shadow-[0_2px_10px_rgba(255,255,255,0.3)]" : "bg-black/65 hover:bg-white"
              )}
            >
              <Eye size={12} className={inWatched ? "fill-black text-black" : "text-white"} />
            </motion.button>
          </div>

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            {logoData.path ? (
              <img
                src={`${BACKDROP_BASE}${logoData.path}`}
                alt={title}
                className="max-h-[36px] max-w-[60%] object-contain object-left drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
              />
            ) : (
              <div className="line-clamp-1 text-[13px] font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{title}</div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45">
              <span className="font-semibold uppercase tracking-widest">{mediaType === "movie" ? "Film" : "Series"}</span>
              {year && <><span className="text-white/20">·</span><span>{year}</span></>}
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
});

const Rail = React.memo(function Rail({
  title,
  items,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  largeCards = false,
}: {
  title: string;
  items: MediaItem[];
  mediaType?: MediaType;
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  largeCards?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visibleItems = IS_MOBILE ? items.slice(0, 12) : items;

  const scroll = (direction: "left" | "right") => {
    ref.current?.scrollBy({
      left: direction === "left" ? (largeCards ? -340 : -280) : largeCards ? 340 : 280,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-8 md:mb-12">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">{title}</h3>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/8 bg-[#07080d]/95 p-3 text-white/40 shadow-xl backdrop-blur-sm transition hover:border-[#efb43f]/40 hover:text-[#efb43f] active:scale-90 sm:flex"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/8 bg-[#07080d]/95 p-3 text-white/40 shadow-xl backdrop-blur-sm transition hover:border-[#efb43f]/40 hover:text-[#efb43f] active:scale-90 sm:flex"
        >
          <ChevronRight size={16} />
        </button>

        <div
          ref={ref}
          className={cn(
            "flex overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory md:snap-none touch-pan-x",
            largeCards ? "gap-3 md:gap-4" : "gap-2.5 md:gap-3"
          )}
        >
          {visibleItems.map((item) => {
            const type = mediaType || item.media_type || (item.first_air_date ? "tv" : "movie");
            const k = keyFor({ id: item.id, mediaType: type });
            return (
              <PosterCard
                key={k}
                item={item}
                mediaType={type}
                onOpen={() => onOpen(item, type)}
                onToggleWatchlist={() => onToggleWatchlist(item, type)}
                onToggleWatched={() => onToggleWatched(item, type)}
                inWatchlist={watchlistKeys.has(k)}
                inWatched={watchedKeys.has(k)}
                userRating={ratings[k]}
                size={largeCards ? "large" : "default"}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
});

type StreamingRowItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  image: string | null;
  subtitle?: string;
  badge?: string;
  progress?: number;
  meta?: string;
  sourceItem?: MediaItem | LibraryItem;
};

function StreamingMediaCard({
  item,
  onOpen,
}: {
  item: StreamingRowItem;
  onOpen: (item: StreamingRowItem) => void;
}) {
  const [glowColor, setGlowColor] = useState("rgba(239,180,63,0.0)");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!item.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${BACKDROP_BASE}${item.image}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 4, 4);
        const d = ctx.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        if (n) setGlowColor(`rgba(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)},0.5)`);
      } catch {}
    };
  }, [item.image]);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative w-[200px] min-w-[200px] md:w-[280px] md:min-w-[280px] lg:w-[340px] lg:min-w-[340px] snap-start"
    >
      {/* Color glow */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 -z-10 rounded-[20px] blur-xl"
        style={{ background: glowColor }}
      />
      <motion.button
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => onOpen(item)}
        className="group relative w-full overflow-hidden rounded-[14px] bg-[#0d0f14] text-left shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {item.image ? (
            <img
              src={`${BACKDROP_BASE}${item.image}`}
              alt={item.title}
              className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.07]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0d0f14]">
              <Film size={24} className="text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_35%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.92)_100%)]" />

          {/* Badge */}
          {item.badge && (
            <div className="absolute left-2.5 top-2.5">
              <span className="rounded-sm bg-[#efb43f] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">{item.badge}</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <div className="line-clamp-2 text-[17px] font-bold leading-tight tracking-[-0.03em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] lg:text-[19px]">
              {item.title}
            </div>
            {item.meta ? <div className="mt-1 text-[11px] text-white/50">{item.meta}</div> : null}
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

function ContinueWatchingCard({
  item,
  onOpen,
  onRemove,
}: {
  item: StreamingRowItem;
  onOpen: (item: StreamingRowItem) => void;
  onRemove: (item: StreamingRowItem) => void;
}) {
  const progress = Math.max(0, Math.min(100, item.progress || 0));
  const [glowColor, setGlowColor] = useState("rgba(239,180,63,0.0)");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!item.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${BACKDROP_BASE}${item.image}`;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 4; canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 4, 4);
        const d = ctx.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
        if (n) setGlowColor(`rgba(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)},0.5)`);
      } catch {}
    };
  }, [item.image]);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative w-[200px] min-w-[200px] md:w-[280px] md:min-w-[280px] lg:w-[340px] lg:min-w-[340px] snap-start"
    >
      {/* Color glow */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-2 -z-10 rounded-[20px] blur-xl"
        style={{ background: glowColor }}
      />
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="group relative w-full overflow-hidden rounded-[14px] bg-[#0d0f14] shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
      >
        <button onClick={() => onOpen(item)} className="block w-full text-left">
          <div className="relative aspect-[16/9] overflow-hidden">
            {item.image ? (
              <img
                src={`${BACKDROP_BASE}${item.image}`}
                alt={item.title}
                className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.07]"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#0d0f14]">
                <Film size={24} className="text-white/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.7)_70%,rgba(0,0,0,0.95)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <div className="line-clamp-1 text-[15px] font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {item.title}
              </div>
              {item.subtitle ? <div className="mt-0.5 text-[11px] text-white/50">{item.subtitle}</div> : null}
              {/* Gold progress bar */}
              <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#efb43f] to-[#f5ca6e]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {item.meta ? <div className="mt-1.5 text-[10px] text-white/40">{item.meta}</div> : null}
            </div>
          </div>
        </button>

        <button
          onClick={() => onRemove(item)}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white/50 backdrop-blur-md transition hover:bg-black/75 hover:text-white active:scale-90"
          aria-label="Remove"
        >
          <X size={13} />
        </button>
      </motion.div>
    </motion.div>
  );
}

function ContentRow({
  title,
  items,
  onOpen,
  variant = "default",
  onRemoveContinue,
}: {
  title: string;
  items: StreamingRowItem[];
  onOpen: (item: StreamingRowItem) => void;
  variant?: "default" | "continue";
  onRemoveContinue?: (item: StreamingRowItem) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    ref.current?.scrollBy({ left: direction === "left" ? -340 : 340, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="mb-10 md:mb-14">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">{title}</h3>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/10 bg-[#0f1117]/90 p-2.5 text-white/60 shadow-lg backdrop-blur-sm transition hover:border-[#efb43f]/30 hover:text-[#efb43f] md:flex"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 hidden rounded-full border border-white/10 bg-[#0f1117]/90 p-2.5 text-white/60 shadow-lg backdrop-blur-sm transition hover:border-[#efb43f]/30 hover:text-[#efb43f] md:flex"
        >
          <ChevronRight size={16} />
        </button>

        <div ref={ref} className="flex gap-3 overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory md:snap-none md:gap-5">
          {items.map((rowItem) =>
            variant === "continue" ? (
              <ContinueWatchingCard
                key={`${rowItem.mediaType}-${rowItem.id}`}
                item={rowItem}
                onOpen={onOpen}
                onRemove={onRemoveContinue || (() => {})}
              />
            ) : (
              <StreamingMediaCard
                key={`${rowItem.mediaType}-${rowItem.id}`}
                item={rowItem}
                onOpen={onOpen}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
function Grid({
  items,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  size = "default",
}: {
  items: Array<MediaItem | LibraryItem>;
  mediaType?: MediaType;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  size?: "default" | "large" | "grid";
}) {
  return (
    <div className={cn(
      "grid gap-y-6",
      size === "large"
        ? "grid-cols-1 gap-x-[18px] sm:grid-cols-2 xl:grid-cols-3"
        : "grid-cols-1 gap-x-[18px] sm:grid-cols-2 xl:grid-cols-3"
    )}>
      {items.map((item) => {
        const type = mediaType || ("mediaType" in item ? item.mediaType : item.media_type || (item.first_air_date ? "tv" : "movie"));
        const k = keyFor({ id: item.id, mediaType: type });
        return (
          <PosterCard
            key={k}
            item={item as MediaItem & LibraryItem}
            mediaType={type}
            onOpen={() => onOpen(item, type)}
            onToggleWatchlist={() => onToggleWatchlist(item, type)}
            onToggleWatched={() => onToggleWatched(item, type)}
            inWatchlist={watchlistKeys.has(k)}
            inWatched={watchedKeys.has(k)}
            userRating={ratings[k]}
            size={size === "large" ? "large" : "grid"}
          />
        );
      })}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-white/6 bg-white/[0.02] px-8 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#efb43f]/10 border border-[#efb43f]/15">
        <Film size={22} className="text-[#efb43f]/60" />
      </div>
      <div className="text-[17px] font-bold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-white/40">{body}</p>
    </div>
  );
}
function InlineRatingControl({ value, onChange }: { value?: number; onChange: (rating: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const committedValue = typeof value === "number" ? value : 0; // stored as /10
  const previewValue = hoverValue ?? committedValue;
  const committedStars = committedValue / 2;
  const previewStars = previewValue / 2;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
        setHoverValue(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
        setHoverValue(null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange(Math.min(10, committedValue + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange(Math.max(0, committedValue - 1));
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onChange(0);
        setHoverValue(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, committedValue, onChange]);

  const commitRating = (nextValue: number) => {
    onChange(committedValue === nextValue ? 0 : nextValue);
    setHoverValue(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setHoverValue(null)}
      className={cn(
        "inline-flex h-14 items-center overflow-hidden rounded-full border border-white/18 bg-white/8 text-white backdrop-blur transition-all duration-200 ease-out",
        open ? "w-[332px] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]" : "w-[146px] px-4"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 shrink-0"
        aria-label="Toggle rating control"
      >
        <Star size={18} className={cn("transition", committedValue > 0 ? "fill-[#efb43f] text-[#efb43f]" : "text-white/85")} />
        <span className="min-w-[76px] text-[13px] font-semibold text-white/82">{previewStars.toFixed(1)}/5</span>
      </button>

      <div
        className={cn(
          "ml-3 flex items-center gap-1 transition-all duration-200 ease-out",
          open ? "opacity-100 translate-x-0" : "w-0 translate-x-2 overflow-hidden opacity-0"
        )}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const fullActive = previewStars >= star;
          const halfActive = !fullActive && previewStars >= star - 0.5;
          const targetHalf = (star - 0.5) * 2; // stored as /10
          const targetFull = star * 2;

          return (
            <div key={star} className="relative flex h-8 w-8 items-center justify-center">
              <button
                type="button"
                title={`${(targetHalf / 2).toFixed(1)}/5`}
                aria-label={`Rate ${(targetHalf / 2).toFixed(1)} out of 5`}
                onMouseEnter={() => setHoverValue(targetHalf)}
                onFocus={() => setHoverValue(targetHalf)}
                onClick={() => commitRating(targetHalf)}
                className="absolute left-0 top-0 z-10 h-full w-1/2"
              />
              <button
                type="button"
                title={`${(targetFull / 2).toFixed(1)}/5`}
                aria-label={`Rate ${(targetFull / 2).toFixed(1)} out of 5`}
                onMouseEnter={() => setHoverValue(targetFull)}
                onFocus={() => setHoverValue(targetFull)}
                onClick={() => commitRating(targetFull)}
                className="absolute right-0 top-0 z-10 h-full w-1/2"
              />
              <Star size={18} className="text-white/24 transition duration-150" />
              {(fullActive || halfActive) ? (
                <div
                  className="pointer-events-none absolute left-0 top-0 flex h-full items-center overflow-hidden transition-all duration-150"
                  style={{ width: fullActive ? "100%" : "50%" }}
                >
                  <Star size={18} className="fill-[#efb43f] text-[#efb43f] drop-shadow-[0_0_8px_rgba(239,180,63,0.35)]" />
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="ml-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/55">
          {hoverValue !== null ? `Preview ${(hoverValue / 2).toFixed(1)}/5` : committedValue > 0 ? `Saved ${committedStars.toFixed(1)}/5` : "Unset"}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(0);
            setHoverValue(null);
          }}
          className="ml-1 rounded-full border border-white/10 px-2 py-1 text-[10px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
function SegmentTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string; count?: number }>;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              active ? "bg-[#efb43f] text-black" : "text-white/65 hover:text-white"
            )}
          >
            {option.label}{typeof option.count === "number" ? ` (${option.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

// ── Catalog / My Library ─────────────────────────────────────────────────────
type CatalogTab  = "all" | "watchlist" | "watching" | "waiting" | "watched";
type CatalogView = "grid" | "list" | "rail";
type CatalogSort = "added" | "title" | "year" | "rating";
type MediaFilter = "all" | "movie" | "tv" | "anime";

type AnnotatedItem = LibraryItem & { status: "watchlist" | "watching" | "waiting" | "watched" };

function CatalogStatusBadge({
  status,
  compact = false,
}: {
  status: "watchlist" | "watching" | "waiting" | "watched";
  compact?: boolean;
}) {
  if (status === "watchlist")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
          compact
            ? "bg-[#efb43f]/22 px-[5px] py-[3px] text-[9px] text-[#efb43f]"
            : "border border-[#efb43f]/25 bg-[#efb43f]/12 px-2 py-[3px] text-[10px] text-[#efb43f]",
        )}
      >
        <Bookmark size={compact ? 6 : 8} fill="currentColor" />
        {!compact && "To Watch"}
      </span>
    );
  if (status === "watching")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
          compact
            ? "bg-cyan-500/22 px-[5px] py-[3px] text-[9px] text-cyan-400"
            : "border border-cyan-500/25 bg-cyan-500/12 px-2 py-[3px] text-[10px] text-cyan-400",
        )}
      >
        <Play size={compact ? 6 : 8} fill="currentColor" />
        {!compact && "Watching"}
      </span>
    );
  if (status === "waiting")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
          compact
            ? "bg-amber-500/22 px-[5px] py-[3px] text-[9px] text-amber-400"
            : "border border-amber-500/25 bg-amber-500/12 px-2 py-[3px] text-[10px] text-amber-400",
        )}
      >
        <Clock size={compact ? 6 : 8} />
        {!compact && "Waiting"}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[3px] rounded-full font-semibold leading-none",
        compact
          ? "bg-white/14 px-[5px] py-[3px] text-[9px] text-white/50"
          : "border border-white/12 bg-white/8 px-2 py-[3px] text-[10px] text-white/50",
      )}
    >
      <Check size={compact ? 6 : 8} />
      {!compact && "Watched"}
    </span>
  );
}

function CatalogGridCard({
  item, status, userRating, onOpen, onToggleWatchlist, onToggleWatched, onWatching, onWaiting, onRemove,
}: {
  item: AnnotatedItem;
  status: "watchlist" | "watching" | "waiting" | "watched";
  userRating?: number;
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onWatching: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const displayRating = userRating ?? item.rating;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Status-specific subtle ring — signals status at a glance before hover
  const statusRing =
    status === "watchlist"
      ? "ring-1 ring-inset ring-[#efb43f]/28"
      : status === "watching"
      ? "ring-1 ring-inset ring-cyan-500/32"
      : status === "waiting"
      ? "ring-1 ring-inset ring-amber-500/28"
      : "";

  return (
    <div
      className={cn(
        "group relative aspect-[2/3] cursor-pointer rounded-[12px] bg-white/[0.04] transition-all duration-300",
        statusRing,
      )}
      onClick={onOpen}
    >
      {/* Inner poster area — clipped to card boundary */}
      <div className="absolute inset-0 overflow-hidden rounded-[12px]">
        {/* Poster image */}
        {item.posterPath ? (
          <img
            src={`${POSTER_BASE}${item.posterPath}`}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/[0.03]">
            <Film size={26} className="text-white/12" />
            <p className="px-3 text-center text-[9px] leading-tight text-white/18">{item.title}</p>
          </div>
        )}

        {/* Bottom gradient + persistent info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-2 pb-2.5 pt-14">
          <p className="text-[11px] font-semibold leading-snug text-white line-clamp-2">{item.title}</p>
          <div className="mt-[3px] flex items-center gap-1">
            <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-white/32">
              {item.mediaType === "tv" ? "TV" : "Film"}
            </span>
            {item.year && item.year !== "—" && (
              <>
                <span className="text-[8px] text-white/18">·</span>
                <span className="text-[9px] text-white/32">{item.year}</span>
              </>
            )}
            {displayRating != null && displayRating > 0 && (
              <>
                <span className="text-[8px] text-white/18">·</span>
                <span className="text-[9px] font-semibold text-[#efb43f]">★ {displayRating.toFixed(1)}</span>
              </>
            )}
          </div>
        </div>

        {/* Compact status badge — top-left */}
        <div className="absolute left-1.5 top-1.5">
          <CatalogStatusBadge status={status} compact />
        </div>

        {/* Watchlist: thin gold shimmer line at top */}
        {status === "watchlist" && (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#efb43f]/55 to-transparent" />
        )}

        {/* Watching: cyan progress strip at bottom */}
        {status === "watching" && (
          <div className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-black/30">
            <div className="h-full w-[52%] rounded-r-full bg-cyan-400/75" />
          </div>
        )}

        {/* Waiting: amber top strip */}
        {status === "waiting" && (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />
        )}
      </div>

      {/* Mobile: always-visible ⋯ menu button */}
      {IS_MOBILE && (
        <button
          onClick={(e) => { e.stopPropagation(); setMobileMenuOpen((v) => !v); }}
          className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/75 backdrop-blur-sm transition active:scale-90"
        >
          <MoreHorizontal size={13} />
        </button>
      )}

      {/* Mobile quick-action sheet (shown on ⋯ tap) */}
      <AnimatePresence>
        {IS_MOBILE && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1 rounded-b-[12px] bg-[#0d0f16]/97 px-2 py-2.5 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={(e) => { e.stopPropagation(); onOpen(); setMobileMenuOpen(false); }}
              className="w-full rounded-[7px] bg-[#efb43f] py-2 text-[11px] font-bold text-black active:opacity-80">
              Open Details
            </button>
            <div className="flex gap-1">
              {status !== "watched" && (
                <button onClick={(e) => { e.stopPropagation(); onToggleWatched(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] bg-emerald-600/90 py-1.5 text-[10px] font-bold text-white active:opacity-80">
                  ✓ Watched
                </button>
              )}
              {status !== "watching" && (
                <button onClick={(e) => { e.stopPropagation(); onWatching(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] bg-cyan-700/90 py-1.5 text-[10px] font-bold text-white active:opacity-80">
                  ▶ Watching
                </button>
              )}
              {status !== "waiting" && (
                <button onClick={(e) => { e.stopPropagation(); onWaiting(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] bg-amber-700/90 py-1.5 text-[10px] font-bold text-white active:opacity-80">
                  ⏳ Wait
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {status !== "watchlist" && (
                <button onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); setMobileMenuOpen(false); }}
                  className="flex-1 rounded-[7px] border border-[#efb43f]/40 bg-[#efb43f]/10 py-1.5 text-[10px] font-semibold text-[#efb43f] active:opacity-80">
                  + List
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onRemove(); setMobileMenuOpen(false); }}
                className="flex-1 rounded-[7px] bg-white/[0.05] py-1.5 text-[10px] font-semibold text-red-400/80 active:opacity-80">
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: Dark action tray — slides up from below the card on hover */}
      <div
        className="absolute inset-x-0 bottom-0 translate-y-full rounded-b-[12px] bg-[#0d0f16]/96 px-2 py-2.5 backdrop-blur-md transition-transform duration-200 ease-out group-hover:translate-y-0 hidden md:flex flex-col gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Open Details — gold primary */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="w-full rounded-[7px] bg-[#efb43f] py-1.5 text-[10.5px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          Open Details
        </button>
        <div className="flex gap-1">
          {/* Mark Watched */}
          {status !== "watched" && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
              className="flex-1 rounded-[7px] bg-emerald-600/90 py-1.5 text-[10px] font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
            >
              ✓ Watched
            </button>
          )}
          {/* Watching */}
          {status !== "watching" && (
            <button
              onClick={(e) => { e.stopPropagation(); onWatching(); }}
              className="flex-1 rounded-[7px] bg-cyan-700/90 py-1.5 text-[10px] font-bold text-white transition hover:bg-cyan-600 active:scale-[0.98]"
            >
              ▶ Watching
            </button>
          )}
          {/* Waiting */}
          {status !== "waiting" && (
            <button
              onClick={(e) => { e.stopPropagation(); onWaiting(); }}
              className="flex-1 rounded-[7px] bg-amber-700/90 py-1.5 text-[10px] font-bold text-white transition hover:bg-amber-600 active:scale-[0.98]"
            >
              ⏳ Wait
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {/* Watchlist */}
          {status !== "watchlist" && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
              className="flex-1 rounded-[7px] border border-[#efb43f]/40 bg-[#efb43f]/10 py-1.5 text-[10px] font-semibold text-[#efb43f] transition hover:bg-[#efb43f]/20 active:scale-[0.98]"
            >
              + List
            </button>
          )}
          {/* Remove */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex-1 rounded-[7px] bg-white/[0.05] py-1.5 text-[10px] font-semibold text-red-400/80 transition hover:bg-red-700/30 hover:text-red-300 active:scale-[0.98]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogListRow({
  item, status, userRating, watching, onOpen, onToggleWatchlist, onToggleWatched, onWatching, onWaiting, onRemove,
}: {
  item: AnnotatedItem;
  status: "watchlist" | "watching" | "waiting" | "watched";
  userRating?: number;
  watching?: { season: number; watchedEpisodes: number };
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onWatching: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const displayRating = userRating ?? item.rating;
  const accentClass =
    status === "watchlist"
      ? "bg-[#efb43f]/65"
      : status === "watching"
      ? "bg-cyan-400/65"
      : status === "waiting"
      ? "bg-amber-400/65"
      : "bg-white/18";

  return (
    <div className="group relative flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors duration-150 hover:bg-white/[0.04]">
      {/* Left status accent strip — visible on hover */}
      <div
        className={cn(
          "absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          accentClass,
        )}
      />

      {/* Poster thumbnail */}
      <div
        className="h-[58px] w-[40px] shrink-0 cursor-pointer overflow-hidden rounded-[7px] bg-white/[0.06]"
        onClick={onOpen}
      >
        {item.posterPath ? (
          <img
            src={`${POSTER_BASE}${item.posterPath}`}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={13} className="text-white/18" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{item.title}</p>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-[10px] font-medium text-white/32">
            {item.mediaType === "tv" ? "TV" : "Film"}
          </span>
          {item.year && item.year !== "—" && (
            <>
              <span className="text-[9px] text-white/18">·</span>
              <span className="text-[10px] text-white/32">{item.year}</span>
            </>
          )}
          {displayRating != null && displayRating > 0 && (
            <>
              <span className="text-[9px] text-white/18">·</span>
              <span className="text-[10px] font-semibold text-[#efb43f]">★ {displayRating.toFixed(1)}</span>
            </>
          )}
          {watching && item.mediaType === "tv" && (
            <>
              <span className="text-[9px] text-white/18">·</span>
              <span className="text-[10px] text-cyan-400">
                S{watching.season} · {watching.watchedEpisodes} ep
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status badge — hidden on xs, visible sm+ */}
      <div className="hidden shrink-0 sm:block">
        <CatalogStatusBadge status={status} />
      </div>

      {/* Action buttons — always visible for touch accessibility */}
      <div className="flex shrink-0 items-center gap-1.5">
        {status !== "watched" && (
          <button
            onClick={onToggleWatched}
            title="Mark Watched"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/80 text-white transition hover:bg-emerald-500 active:scale-90"
          >
            <Check size={13} />
          </button>
        )}
        {status !== "watching" && (
          <button
            onClick={onWatching}
            title="Mark as Watching"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700/80 text-white transition hover:bg-cyan-600 active:scale-90"
          >
            <Play size={12} />
          </button>
        )}
        {status !== "waiting" && (
          <button
            onClick={onWaiting}
            title="Move to Waiting"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700/80 text-white transition hover:bg-amber-600 active:scale-90"
          >
            <Clock size={12} />
          </button>
        )}
        {status !== "watchlist" && (
          <button
            onClick={onToggleWatchlist}
            title="Add to Watchlist"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efb43f]/20 text-[#efb43f] transition hover:bg-[#efb43f]/35 active:scale-90"
          >
            <Bookmark size={12} />
          </button>
        )}
        <button
          onClick={onRemove}
          title="Remove"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700/60 text-red-200 transition hover:bg-red-600/80 active:scale-90"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── ListsView ──────────────────────────────────────────────────────────────────

function ListsView({
  library,
  customLists,
  ratings,
  onOpenLibrary,
  onCreateList,
  onDeleteList,
  onRenameList,
  onAddToList: _onAddToList,
  onRemoveFromList,
  onOpen,
  followedPeople = [],
  onOpenPerson,
}: {
  library: UserLibrary;
  customLists: CustomList[];
  ratings: Record<string, number>;
  onOpenLibrary: () => void;
  onCreateList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onRenameList: (id: string, name: string) => void;
  onAddToList: (listId: string, item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onRemoveFromList: (listId: string, itemId: number, mediaType: MediaType) => void;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  followedPeople?: import("./types").FollowedPerson[];
  onOpenPerson?: (id: number) => void;
}) {
  const [subTab, setSubTab] = React.useState<"library" | "mylists">("library");
  const [creating, setCreating] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [openListId, setOpenListId] = React.useState<string | null>(null);

  // Library stats
  const totalItems =
    library.watchlist.length +
    library.watched.length +
    (library.watchingItems ?? []).length +
    (library.waitingItems ?? []).length;
  const watchedCount = library.watched.length;
  const watchlistCount = library.watchlist.length;

  // Smart auto-lists
  const topRatedItems = React.useMemo(() => {
    const all = [
      ...library.watchlist,
      ...library.watched,
      ...(library.watchingItems ?? []),
      ...(library.waitingItems ?? []),
    ];
    const seen = new Set<string>();
    return all.filter((item) => {
      const k = `${item.mediaType}:${item.id}`;
      const r = ratings[k];
      if (r == null || r < 8) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => (ratings[`${b.mediaType}:${b.id}`] ?? 0) - (ratings[`${a.mediaType}:${a.id}`] ?? 0));
  }, [library, ratings]);

  const AUTO_LISTS = [
    { id: "auto-watchlist", name: "Watchlist", items: library.watchlist,   icon: "🔖", color: "from-[#efb43f]/20 to-transparent", count: watchlistCount },
    { id: "auto-watched",   name: "Watched",   items: library.watched,     icon: "✅", color: "from-emerald-500/20 to-transparent", count: watchedCount   },
    { id: "auto-rated",     name: "Top Rated", items: topRatedItems,       icon: "⭐", color: "from-purple-500/20 to-transparent", count: topRatedItems.length },
  ];

  function handleCreateSubmit() {
    const name = newListName.trim();
    if (name) { onCreateList(name); setNewListName(""); setCreating(false); }
  }

  function handleRenameSubmit(id: string) {
    const name = renameValue.trim();
    if (name) onRenameList(id, name);
    setRenamingId(null);
    setRenameValue("");
  }

  // ── Open list detail view ────────────────────────────────────────────────
  const openedAutoList = openListId ? AUTO_LISTS.find((l) => l.id === openListId) : null;
  const openedCustomList = openListId ? customLists.find((l) => l.id === openListId) : null;

  if (openListId && (openedAutoList || openedCustomList)) {
    const listName = openedAutoList?.name ?? openedCustomList?.name ?? "";
    const listItems: LibraryItem[] = openedAutoList ? (openedAutoList.items as LibraryItem[]) : [];
    const customItems = openedCustomList?.items ?? [];
    const displayItems = openedAutoList ? listItems : customItems;
    const isEmpty = displayItems.length === 0;

    return (
      <div className="min-h-screen pb-28">
        {/* Back header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.06] bg-[#07080d]/96 px-4 py-3.5 backdrop-blur-xl md:px-10">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpenListId(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
          >
            <ChevronLeft size={15} />
          </motion.button>
          <h2 className="text-[15px] font-bold tracking-tight text-white">{listName}</h2>
          <span className="ml-auto rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white/40">
            {displayItems.length} {displayItems.length === 1 ? "title" : "titles"}
          </span>
        </div>

        <div className="px-4 pt-4 md:px-10">
          {isEmpty ? (
            /* ── Premium empty state ── */
            <div className="relative flex flex-col items-center justify-center py-24 text-center">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-full bg-[#efb43f]/[0.06] blur-3xl" />
              </div>
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <List size={28} className="text-white/20" />
              </div>
              <p className="text-[15px] font-semibold text-white/40">This list is empty</p>
              <p className="mt-1 text-[12px] text-white/22">Add titles from any movie or TV page</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {displayItems.map((item) => (
                <motion.div
                  key={`${item.mediaType}:${item.id}`}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[12px] bg-white/[0.04] ring-1 ring-white/[0.07] hover:ring-[#efb43f]/40 hover:shadow-[0_8px_32px_rgba(239,180,63,0.12)]"
                  onClick={() => onOpen(item, item.mediaType)}
                >
                  {item.posterPath ? (
                    <img src={`${POSTER_BASE}${item.posterPath}`} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-white/[0.02]">
                      <Film size={22} className="text-white/12" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2 pb-2 pt-10">
                    <p className="text-[10px] font-semibold leading-tight text-white line-clamp-2">{item.title}</p>
                  </div>
                  {/* Remove button (custom lists only) */}
                  {openedCustomList && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFromList(openListId!, item.id, item.mediaType); }}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white/60 opacity-0 transition hover:text-white group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STATS ────────────────────────────────────────────────────────────────────
  const BENTO_STATS = [
    { label: "Watched",   value: watchedCount,  icon: Check,    accent: "text-emerald-400", glow: "shadow-[0_0_24px_rgba(52,211,153,0.08)]", border: "hover:border-emerald-500/30" },
    { label: "Watchlist", value: watchlistCount, icon: Bookmark, accent: "text-[#efb43f]",   glow: "shadow-[0_0_24px_rgba(239,180,63,0.08)]",  border: "hover:border-[#efb43f]/30"  },
    { label: "Total",     value: totalItems,     icon: Film,     accent: "text-white",        glow: "",                                         border: "hover:border-white/20"       },
  ];

  return (
    <div className="min-h-screen pb-28">

      {/* ── Header ── */}
      <div className="px-4 pb-2 pt-6 md:px-10">
        <h1 className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
          Lists
        </h1>
        <p className="mt-0.5 text-[13px] text-white/35">Your personal cinema collection</p>
      </div>

      {/* ── Animated pill tab switcher ── */}
      <div className="px-4 py-4 md:px-10">
        <div className="inline-flex rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-1">
          {(["library", "mylists"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className="relative px-5 py-1.5 text-[12px] font-semibold transition-colors duration-200"
            >
              {subTab === tab && (
                <motion.div
                  layoutId="lists-subtab-pill"
                  className="absolute inset-0 rounded-[10px] bg-[#efb43f] shadow-[0_2px_12px_rgba(239,180,63,0.25)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className={cn("relative z-10 transition-colors duration-200", subTab === tab ? "text-black" : "text-white/45 hover:text-white/70")}>
                {tab === "library" ? "My Library" : "My Lists"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "library" ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-4 md:px-10"
          >
            {/* ── Bento CTA + Stats ── */}
            {/* Hero library card */}
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={onOpenLibrary}
              className="group relative w-full overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] transition-all duration-300 hover:border-[#efb43f]/25 hover:shadow-[0_8px_40px_rgba(239,180,63,0.08)]"
            >
              <div className="flex h-32 overflow-hidden">
                {[...(library.watchingItems ?? []), ...library.watchlist].slice(0, 5).map((item, i) => (
                  <div key={i} className="flex-1 bg-white/[0.03]">
                    {(item as LibraryItem).posterPath ? (
                      <img src={`${POSTER_BASE}${(item as LibraryItem).posterPath}`} alt="" className="h-full w-full object-cover opacity-50 transition duration-500 group-hover:opacity-70" />
                    ) : null}
                  </div>
                ))}
                {(library.watchingItems ?? []).length === 0 && library.watchlist.length === 0 && (
                  <div className="flex flex-1 items-center justify-center">
                    <Film size={32} className="text-white/[0.07]" />
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-4">
                <div className="text-left">
                  <p className="text-[15px] font-bold tracking-tight text-white">Browse My Library</p>
                  <p className="text-[12px] text-white/40">{totalItems} titles tracked</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efb43f] transition group-hover:scale-110">
                  <ChevronRight size={15} className="text-black" />
                </div>
              </div>
            </motion.button>

            {/* Bento stats grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {BENTO_STATS.map(({ label, value, icon: Icon, accent, glow, border }) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-[16px] border border-white/[0.07] bg-white/[0.02] px-3 py-3.5 text-center backdrop-blur-xl transition-all duration-300",
                    glow, border,
                  )}
                >
                  <Icon size={14} className={cn("mx-auto mb-1.5 opacity-60", accent)} />
                  <p className={cn("text-[24px] font-black leading-none tracking-tight", accent)}>{value}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.07em] text-white/30">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick-access auto-list tiles */}
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">Quick Access</p>
              <div className="grid grid-cols-3 gap-2">
                {AUTO_LISTS.map((al) => (
                  <motion.button
                    key={al.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setOpenListId(al.id)}
                    className={cn(
                      "relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-gradient-to-b p-3 text-left transition-all duration-300 hover:border-white/[0.15]",
                      al.color,
                    )}
                  >
                    <span className="text-xl">{al.icon}</span>
                    <p className="mt-2 text-[12px] font-semibold text-white">{al.name}</p>
                    <p className="text-[10px] text-white/35">{al.count}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ── Following rail ── */}
            {followedPeople.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">Following</p>
                <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                  {followedPeople.map((person, i) => (
                    <motion.button
                      key={person.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onOpenPerson?.(person.id)}
                      className="group flex shrink-0 flex-col items-center gap-2"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 transition-all duration-300 group-hover:border-[#efb43f]/60 group-hover:shadow-[0_0_16px_rgba(239,180,63,0.25)]">
                        {person.profilePath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                            alt={person.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-[22px] font-bold text-white/30">
                            {person.name.charAt(0)}
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 rounded-full ring-0 transition-all group-hover:ring-2 group-hover:ring-[#efb43f]/40" />
                      </div>
                      <p className="w-16 truncate text-center text-[10px] font-medium text-white/60 transition group-hover:text-white/90">
                        {person.name.split(" ")[0]}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="mylists"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-4 md:px-10"
          >
            {/* Smart auto-lists */}
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">Smart Lists</p>
            <div className="mb-5 flex flex-col gap-2">
              {AUTO_LISTS.map((al) => (
                <motion.button
                  key={al.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setOpenListId(al.id)}
                  className="flex items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left backdrop-blur-xl transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
                >
                  <span className="text-xl">{al.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white">{al.name}</p>
                    <p className="text-[11px] text-white/35">{al.count} items</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-white/20 transition group-hover:text-white/50" />
                </motion.button>
              ))}
            </div>

            {/* Custom lists header */}
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">My Lists</p>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setCreating(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#efb43f] text-black shadow-[0_2px_10px_rgba(239,180,63,0.3)] transition hover:brightness-110"
              >
                <Plus size={14} />
              </motion.button>
            </div>

            {/* Create new list */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-[14px] border border-[#efb43f]/35 bg-[#efb43f]/[0.06] px-3 py-2.5">
                    <input
                      autoFocus
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateSubmit();
                        if (e.key === "Escape") { setCreating(false); setNewListName(""); }
                      }}
                      placeholder="List name…"
                      className="flex-1 bg-transparent text-[13px] text-white placeholder-white/25 outline-none"
                    />
                    <button onClick={handleCreateSubmit} className="text-[12px] font-bold text-[#efb43f] transition hover:brightness-125">Save</button>
                    <button onClick={() => { setCreating(false); setNewListName(""); }} className="text-white/35 transition hover:text-white">
                      <X size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom list cards or empty state */}
            {customLists.length === 0 && !creating ? (
              <div className="relative flex flex-col items-center justify-center py-20 text-center">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-full bg-[#efb43f]/[0.05] blur-3xl" />
                </div>
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <LayoutList size={28} className="text-white/20" />
                </div>
                <p className="text-[15px] font-semibold text-white/40">No custom lists yet</p>
                <p className="mt-1 text-[12px] text-white/22">Tap + to create your first collection</p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setCreating(true)}
                  className="mt-5 rounded-full bg-[#efb43f] px-5 py-2 text-[12px] font-bold text-black shadow-[0_4px_16px_rgba(239,180,63,0.25)] transition hover:brightness-110"
                >
                  Create a list
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {customLists.map((list) => (
                  <motion.div
                    key={list.id}
                    layout
                    className="group flex items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 backdrop-blur-xl transition-all hover:border-white/[0.14] hover:bg-white/[0.05]"
                  >
                    {/* Poster thumbnail */}
                    <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
                      {list.items.slice(0, 1).map((item) =>
                        item.posterPath ? (
                          <img key={item.id} src={`${POSTER_BASE}${item.posterPath}`} alt="" className="h-full w-full object-cover" />
                        ) : null
                      )}
                      {list.items.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center">
                          <List size={13} className="text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Name / rename */}
                    {renamingId === list.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(list.id);
                          if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                        }}
                        onBlur={() => handleRenameSubmit(list.id)}
                        className="flex-1 bg-transparent text-[13px] font-semibold text-white outline-none"
                      />
                    ) : (
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpenListId(list.id)}>
                        <p className="truncate text-[13px] font-semibold text-white">{list.name}</p>
                        <p className="text-[11px] text-white/35">{list.items.length} {list.items.length === 1 ? "item" : "items"}</p>
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => { setRenamingId(list.id); setRenameValue(list.name); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/45 transition hover:bg-white/[0.12] hover:text-white"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteList(list.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400/60 transition hover:bg-red-500/20 hover:text-red-300"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MyListView ─────────────────────────────────────────────────────────────────

function MyListView({
  library,
  watchlistKeys,
  watchedKeys,
  watchingKeys,
  waitingKeys: _waitingKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onAddToWatching,
  onAddToWaiting,
  onRemoveFromLibrary,
  onExport,
  onImport,
  appLanguage,
  initialTab,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  watchingKeys: Set<string>;
  waitingKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWatching: (item: LibraryItem, mediaType: MediaType) => void;
  onAddToWaiting: (item: LibraryItem, mediaType: MediaType) => void;
  onRemoveFromLibrary: (item: LibraryItem, mediaType: MediaType) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  appLanguage: AppLanguage;
  initialTab?: "all" | "watchlist" | "watching" | "waiting" | "watched";
}) {
  const [tab, setTab] = useState<CatalogTab>(() => (initialTab as CatalogTab) || "all");
  const [viewMode, setViewMode] = useState<CatalogView>("grid");
  const [sortBy, setSortBy] = useState<CatalogSort>("added");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const isAnime = useCallback(
    (item: AnnotatedItem) =>
      item.genre_ids?.includes(16) || item.genres?.some((g) => g.id === 16) || false,
    [],
  );
  const [query, setQuery] = useState("");
  const [randomPick, setRandomPick] = useState<AnnotatedItem | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Update internal tab when initialTab prop changes (navigation from stats cards)
  useEffect(() => { if (initialTab) setTab(initialTab as CatalogTab); }, [initialTab]);

  // All items merged with status annotation (watching first so it surfaces on "all" tab)
  const allItems = useMemo<AnnotatedItem[]>(() => {
    const seen = new Set<string>();
    const result: AnnotatedItem[] = [];
    (library.watchingItems || []).forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watching" }); }
    });
    (library.waitingItems || []).forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "waiting" }); }
    });
    library.watchlist.forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watchlist" }); }
    });
    library.watched.forEach((item) => {
      const k = keyFor(item);
      if (!seen.has(k)) { seen.add(k); result.push({ ...item, status: "watched" }); }
    });
    return result;
  }, [library.watchlist, library.watched, library.watchingItems, library.waitingItems]);

  const tabItems = useMemo(() => {
    if (tab === "all") return allItems;
    return allItems.filter((i) => i.status === tab);
  }, [allItems, tab]);

  const filteredItems = useMemo(() => {
    let items = tabItems;
    if (mediaFilter === "movie") items = items.filter((i) => i.mediaType === "movie" && !isAnime(i));
    else if (mediaFilter === "tv") items = items.filter((i) => i.mediaType === "tv" && !isAnime(i));
    else if (mediaFilter === "anime") items = items.filter((i) => isAnime(i));
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    return items;
  }, [tabItems, mediaFilter, query, isAnime]);

  const sortedItems = useMemo<AnnotatedItem[]>(() => {
    const arr = [...filteredItems];
    if (sortBy === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "year") arr.sort((a, b) => (b.year || "0").localeCompare(a.year || "0"));
    else if (sortBy === "rating") {
      arr.sort((a, b) => {
        const ra = library.ratings[keyFor(a)] ?? a.rating ?? 0;
        const rb = library.ratings[keyFor(b)] ?? b.rating ?? 0;
        return rb - ra;
      });
    }
    return arr;
  }, [filteredItems, sortBy, library.ratings]);

  const stats = useMemo(() => {
    const total = allItems.length;
    const anime = allItems.filter((i) => i.genre_ids?.includes(16) || i.genres?.some((g) => g.id === 16)).length;
    const movies = allItems.filter((i) => i.mediaType === "movie" && !(i.genre_ids?.includes(16) || i.genres?.some((g) => g.id === 16))).length;
    const tv = allItems.filter((i) => i.mediaType === "tv" && !(i.genre_ids?.includes(16) || i.genres?.some((g) => g.id === 16))).length;
    const ratedItems = allItems.filter((i) => library.ratings[keyFor(i)] != null);
    const avgRating = ratedItems.length > 0
      ? ratedItems.reduce((s, i) => s + (library.ratings[keyFor(i)] || 0), 0) / ratedItems.length
      : null;
    const watchingCount  = (library.watchingItems || []).length;
    const waitingCount   = (library.waitingItems  || []).length;
    const watchlistCount = library.watchlist.length;
    const watchedCount   = library.watched.length;
    return { total, movies, tv, anime, avgRating, watchingCount, waitingCount, watchlistCount, watchedCount };
  }, [allItems, library.ratings, library.watchingItems, library.waitingItems, library.watchlist.length, library.watched.length]);

  const shuffle = () => {
    if (!sortedItems.length) return;
    setRandomPick(sortedItems[Math.floor(Math.random() * sortedItems.length)]);
  };

  const sortLabels: Record<CatalogSort, string> = {
    added: "Date Added", title: "Title A→Z", year: "Year", rating: "Rating",
  };

  const TABS: Array<{ key: CatalogTab; label: string; count: number }> = [
    { key: "all",       label: "All",       count: allItems.length },
    { key: "watchlist", label: "Watchlist", count: library.watchlist.length },
    { key: "watching",  label: "Watching",  count: (library.watchingItems || []).length },
    { key: "waiting",   label: "Waiting",   count: (library.waitingItems  || []).length },
    { key: "watched",   label: "Watched",   count: library.watched.length },
  ];

  return (
    <div className="pb-8">

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 1 + LAYER 2 — HEADER ZONE
          Bleeds to full width via negative margins, contains:
            • Rotating movie-quote watermark background (replaces poster mosaic)
            • Page title, library count, subtitle, quote, actions  (Layer 1)
            • Premium tab row                                       (Layer 2)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 mb-0 overflow-hidden" style={{ marginBottom: 0 }}>

        {/* ── Deep dark base ── */}
        <div className="absolute inset-0 bg-[#07080d]" aria-hidden="true" />
        {/* Gold radial glow at top-center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(239,180,63,0.07),transparent_70%)]" aria-hidden="true" />
        {/* Bottom fade into page */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#07080d] to-transparent" aria-hidden="true" />

        {/* ── LAYER 1: Title + Stats + Actions ── */}
        <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-2 sm:pt-6 pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:items-end sm:gap-4">

            {/* Title block */}
            <div>
              <div className="flex items-baseline gap-2.5">
                <h1 className="text-[20px] font-black tracking-[-0.04em] text-white leading-none sm:text-[30px] lg:text-[34px]">
                  My Library
                </h1>
                <span className="mb-0.5 rounded-[6px] bg-white/8 px-2 py-[3px] text-[11px] font-bold tabular-nums text-white/45 leading-none">
                  {stats.total}
                </span>
              </div>
              <p className="mt-1 hidden text-[11px] tracking-wide text-white/38 sm:mt-1.5 sm:block sm:text-[12px]">
                {[
                  stats.movies > 0 && `${stats.movies} film${stats.movies !== 1 ? "s" : ""}`,
                  stats.tv > 0 && `${stats.tv} show${stats.tv !== 1 ? "s" : ""}`,
                  stats.anime > 0 && `${stats.anime} anime`,
                  stats.avgRating != null && `★ ${stats.avgRating.toFixed(1)} avg`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </div>

            {/* Action buttons — Sync button removed */}
            <div className="flex items-center gap-2">
              <button
                onClick={onExport}
                className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/10 bg-white/[0.05] px-3 text-[11px] font-medium text-white/55 backdrop-blur-sm transition hover:bg-white/[0.09] hover:text-white"
              >
                <FileUp size={11} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] bg-[#efb43f] px-3 text-[11px] font-bold text-black transition hover:brightness-110 active:scale-[0.98]">
                <FileDown size={11} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ""; }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── LAYER 2: Premium Tab Row ── */}
        <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 mt-1.5 sm:mt-5">
          <div className="flex items-end overflow-x-auto [scrollbar-width:none]">
            {TABS.map(({ key, label, count }) => {
              const isActive = tab === key;
              const badgeActive =
                key === "watching"
                  ? "bg-cyan-500/22 text-cyan-400"
                  : key === "waiting"
                  ? "bg-amber-500/22 text-amber-400"
                  : key === "watched"
                  ? "bg-white/14 text-white/60"
                  : "bg-[#efb43f]/22 text-[#efb43f]";
              const accentLine =
                key === "watching"
                  ? "bg-cyan-400"
                  : key === "waiting"
                  ? "bg-amber-400"
                  : key === "watched"
                  ? "bg-white/40"
                  : "bg-[#efb43f]";
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 px-3 pb-3.5 pt-2.5 text-[13px] transition-all duration-200 sm:px-4",
                    isActive
                      ? "font-semibold text-white"
                      : "font-medium text-white/52 hover:text-white/75",
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-[5px] py-[1.5px] text-[9px] font-semibold leading-none tabular-nums transition-colors duration-200",
                      isActive ? badgeActive : "bg-white/5 text-white/22",
                    )}
                  >
                    {count}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="catalog-tab-indicator"
                      className={cn("absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm", accentLine)}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {/* Tab bottom border — barely visible rule */}
          <div className="h-px bg-white/[0.07]" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 3 — STICKY CONTROL BAR
          Sticks below the global nav (top-16 = 64px) on scroll.
          Two rows:
            Row 1 — search · shuffle · view-toggle
            Row 2 — sort · type-filter chips
          ═══════════════════════════════════════════════════════════════════ */}
      {/* Sticky control bar — offset adjusted for mobile top bar (≈55px) vs desktop nav (64px) */}
      <div className="sticky top-[55px] md:top-16 z-30 -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 border-b border-white/[0.055] bg-[#07080d]/95 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-10 xl:px-14">

        {/* Row 1: Search + shuffle + view toggle */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[130px] flex-1 sm:max-w-[300px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/28" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library…"
              className="h-8 w-full rounded-[9px] border border-white/8 bg-white/[0.04] pl-8 pr-8 text-[12px] text-white placeholder-white/22 outline-none transition focus:border-white/18 focus:bg-white/[0.07]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/28 transition hover:text-white/65"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Shuffle */}
          <button
            onClick={shuffle}
            title="Random pick"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/8 bg-white/[0.03] text-white/42 transition hover:bg-white/[0.07] hover:text-[#efb43f]"
          >
            <RefreshCw size={13} />
          </button>

          {/* View mode toggle */}
          <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-white/8 bg-white/[0.02]">
            {([["grid", "⊞"], ["list", "≡"], ["rail", "⋯"]] as const).map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as CatalogView)}
                className={cn(
                  "px-2.5 py-1.5 text-[13px] transition",
                  viewMode === mode ? "bg-white/12 text-white" : "text-white/35 hover:text-white/65",
                  mode === "rail" ? "hidden sm:block" : "",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Sort + media filter chips */}
        <div className="mt-1.5 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-white/8 bg-white/[0.03] px-2.5 text-[11px] font-medium text-white/50 transition hover:bg-white/[0.07] hover:text-white"
            >
              {sortLabels[sortBy]}
              <ChevronRight size={10} className="rotate-90 opacity-60" />
            </button>
            {showSortMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 w-[148px] overflow-hidden rounded-[10px] border border-white/10 bg-[#111318] py-1 shadow-2xl">
                {(Object.entries(sortLabels) as Array<[CatalogSort, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-[12px] transition hover:bg-white/[0.06]",
                      sortBy === key ? "text-[#efb43f]" : "text-white/62",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-3.5 w-px shrink-0 bg-white/10" />

          {/* Media type filter chips */}
          {(["all", "movie", "tv", "anime"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMediaFilter(type)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition",
                mediaFilter === type
                  ? "bg-white/12 text-white"
                  : "text-white/38 hover:text-white/65",
              )}
            >
              {type === "all" ? "All" : type === "movie" ? "Films" : type === "tv" ? "TV Shows" : "Anime"}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RANDOM PICK BANNER
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {randomPick && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden rounded-[14px] border border-[#efb43f]/22 bg-[#efb43f]/7"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-[7px] bg-white/10">
                {randomPick.posterPath
                  ? <img src={`${POSTER_BASE}${randomPick.posterPath}`} alt={randomPick.title} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center"><Film size={13} className="text-white/20" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#efb43f]/65">Tonight's Pick</p>
                <p className="truncate text-[14px] font-bold text-white">{randomPick.title}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{randomPick.year} · {randomPick.mediaType === "tv" ? "TV Show" : "Movie"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => { onOpen(randomPick, randomPick.mediaType); setRandomPick(null); }}
                  className="rounded-[8px] bg-[#efb43f] px-3 py-1.5 text-[11px] font-bold text-black transition hover:brightness-110"
                >
                  Open
                </button>
                <button
                  onClick={shuffle}
                  className="rounded-[8px] border border-white/10 bg-white/[0.05] p-1.5 text-white/45 transition hover:text-white"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => setRandomPick(null)}
                  className="rounded-[8px] border border-white/10 bg-white/[0.05] p-1.5 text-white/32 transition hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          GRID SUMMARY LINE — shows count + sort label for context
          ═══════════════════════════════════════════════════════════════════ */}
      {sortedItems.length > 0 && (
        <div className="mt-3 mb-2 flex items-center justify-between">
          <p className="text-[11px] tabular-nums text-white/28">
            {sortedItems.length === allItems.length
              ? `${sortedItems.length} title${sortedItems.length !== 1 ? "s" : ""}`
              : `${sortedItems.length} of ${allItems.length}`}
            {query && <span className="text-white/38"> · "{query}"</span>}
          </p>
          <p className="text-[11px] text-white/20">{sortLabels[sortBy]}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENT AREA — grid / list / rail
          ═══════════════════════════════════════════════════════════════════ */}
      {sortedItems.length === 0 ? (
        tab === "waiting" && !query ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-[16px] font-bold text-white/55">Nothing waiting yet</p>
            <p className="mt-2 max-w-[260px] text-[12px] leading-relaxed text-white/28">
              Use <span className="font-semibold text-amber-400/60">Waiting</span> for titles that aren't out yet,
              or ones you want to save for the right moment.
            </p>
            <p className="mt-3 text-[11px] text-white/18">
              Tap <span className="font-semibold text-white/30">⏳ Waiting</span> on any card to move it here.
            </p>
          </div>
        ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl opacity-12">🎬</div>
          <p className="text-[15px] font-semibold text-white/42">
            {query
              ? `No results for "${query}"`
              : tab === "all"
              ? "Your library is empty"
              : `No ${tab} titles`}
          </p>
          <p className="mt-1.5 text-[13px] text-white/26">
            {query
              ? "Try a different search term"
              : "Add movies and shows from the Home or Search tabs"}
          </p>
        </div>
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {sortedItems.map((item) => {
            const k = keyFor(item);
            return (
              <CatalogGridCard
                key={k}
                item={item}
                status={item.status}
                userRating={library.ratings[k]}
                onOpen={() => onOpen(item, item.mediaType)}
                onToggleWatchlist={() => onToggleWatchlist(item, item.mediaType)}
                onToggleWatched={() => onToggleWatched(item, item.mediaType)}
                onWatching={() => onAddToWatching(item, item.mediaType)}
                onWaiting={() => onAddToWaiting(item, item.mediaType)}
                onRemove={() => onRemoveFromLibrary(item, item.mediaType)}
              />
            );
          })}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-0">
          {sortedItems.map((item) => {
            const k = keyFor(item);
            const watchData = item.mediaType === "tv" && library.watching[String(item.id)];
            const progress = watchData
              ? { season: watchData.season, watchedEpisodes: (watchData.watchedEpisodesBySeason?.[String(watchData.season)] || []).length }
              : undefined;
            return (
              <CatalogListRow
                key={k}
                item={item}
                status={item.status}
                userRating={library.ratings[k]}
                watching={progress}
                onOpen={() => onOpen(item, item.mediaType)}
                onToggleWatchlist={() => onToggleWatchlist(item, item.mediaType)}
                onToggleWatched={() => onToggleWatched(item, item.mediaType)}
                onWatching={() => onAddToWatching(item, item.mediaType)}
                onWaiting={() => onAddToWaiting(item, item.mediaType)}
                onRemove={() => onRemoveFromLibrary(item, item.mediaType)}
              />
            );
          })}
        </div>
      ) : (
        /* Rail view — grouped by status when tab === "all" */
        <div className="space-y-10">
          {tab === "all" ? (
            <>
              {(library.watchingItems || []).length > 0 && (
                <Rail
                  title="Watching"
                  items={(library.watchingItems || []) as unknown as MediaItem[]}
                  onOpen={(it, type) => onOpen(it as unknown as LibraryItem, type)}
                  onToggleWatchlist={(it, type) => onToggleWatchlist(it as unknown as LibraryItem, type)}
                  onToggleWatched={(it, type) => onToggleWatched(it as unknown as LibraryItem, type)}
                  watchlistKeys={watchlistKeys}
                  watchedKeys={watchedKeys}
                  ratings={library.ratings}
                  largeCards
                />
              )}
              {(library.waitingItems || []).length > 0 && (
                <Rail
                  title="Waiting"
                  items={(library.waitingItems || []) as unknown as MediaItem[]}
                  onOpen={(it, type) => onOpen(it as unknown as LibraryItem, type)}
                  onToggleWatchlist={(it, type) => onToggleWatchlist(it as unknown as LibraryItem, type)}
                  onToggleWatched={(it, type) => onToggleWatched(it as unknown as LibraryItem, type)}
                  watchlistKeys={watchlistKeys}
                  watchedKeys={watchedKeys}
                  ratings={library.ratings}
                  largeCards
                />
              )}
              {library.watchlist.length > 0 && (
                <Rail
                  title="Watchlist"
                  items={library.watchlist as unknown as MediaItem[]}
                  onOpen={(it, type) => onOpen(it as unknown as LibraryItem, type)}
                  onToggleWatchlist={(it, type) => onToggleWatchlist(it as unknown as LibraryItem, type)}
                  onToggleWatched={(it, type) => onToggleWatched(it as unknown as LibraryItem, type)}
                  watchlistKeys={watchlistKeys}
                  watchedKeys={watchedKeys}
                  ratings={library.ratings}
                  largeCards
                />
              )}
              {library.watched.length > 0 && (
                <Rail
                  title="Watched"
                  items={library.watched as unknown as MediaItem[]}
                  onOpen={(it, type) => onOpen(it as unknown as LibraryItem, type)}
                  onToggleWatchlist={(it, type) => onToggleWatchlist(it as unknown as LibraryItem, type)}
                  onToggleWatched={(it, type) => onToggleWatched(it as unknown as LibraryItem, type)}
                  watchlistKeys={watchlistKeys}
                  watchedKeys={watchedKeys}
                  ratings={library.ratings}
                  largeCards
                />
              )}
            </>
          ) : (
            <Rail
              title={TABS.find((t) => t.key === tab)?.label || ""}
              items={sortedItems as unknown as MediaItem[]}
              onOpen={(it, type) => onOpen(it as unknown as LibraryItem, type)}
              onToggleWatchlist={(it, type) => onToggleWatchlist(it as unknown as LibraryItem, type)}
              onToggleWatched={(it, type) => onToggleWatched(it as unknown as LibraryItem, type)}
              watchlistKeys={watchlistKeys}
              watchedKeys={watchedKeys}
              ratings={library.ratings}
              largeCards
            />
          )}
        </div>
      )}
    </div>
  );
}


// ── Detail Tab helper ───────────────────────────────────────────
function DetailTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn(
        "relative min-h-[44px] px-5 py-3 text-[13px] font-semibold tracking-wide uppercase transition-colors duration-150 sm:text-[14px]",
        active ? "text-white" : "text-white/40 hover:text-white/65"
      )}>
      {label}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#e50914] transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0"
      )} />
    </button>
  );
}

// ── Rating Ring helper ──────────────────────────────────────────
function RatingRing({ score, size = 64 }: { score: number; size?: number }) {
  const numScore = parseFloat(String(score)) || 0;
  const pct = (numScore / 10) * 100;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = numScore >= 7.5 ? "#22c55e" : numScore >= 5 ? "#efb43f" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[16px] font-bold text-white leading-none sm:text-[18px]">{numScore.toFixed(1)}</span>
        <span className="text-[9px] text-white/35 font-medium mt-0.5">/10</span>
      </div>
    </div>
  );
}

// ─── EpisodesQuickPickModal ──────────────────────────────────────────────────
function EpisodesQuickPickModal({
  open, onClose,
  item, detail, backdropPath, title,
  episodes, selectedSeason, loadSeason, savedSelectedEpisode, watchedEpisodes,
  library, setCurrentEpisode, setSelectedEpisode, setEpisodeFilter,
  toggleEpisode, markEpisodesUpTo, markSeasonComplete, clearSeasonEpisodes,
  continueToNextEpisode, onPlayEpisode,
}: {
  open: boolean; onClose: () => void;
  item: MediaItem | LibraryItem; detail: DetailData | null;
  backdropPath: string | null; title: string;
  episodes: Episode[]; selectedSeason: number;
  loadSeason: (season: number) => void;
  savedSelectedEpisode: number; watchedEpisodes: number[];
  library: UserLibrary;
  setCurrentEpisode: (showId: number, ep: number, season: number) => void;
  setSelectedEpisode: (ep: number) => void;
  setEpisodeFilter: (showId: number, filter: "all" | "watched" | "unwatched") => void;
  toggleEpisode: (showId: number, episode: number, season?: number) => void;
  markEpisodesUpTo: (showId: number, season: number, episode: number) => void;
  markSeasonComplete: (showId: number, season: number, episodeNumbers: number[]) => void;
  clearSeasonEpisodes: (showId: number, season: number) => void;
  continueToNextEpisode: (showId: number, season: number, episodeNumbers: number[]) => void;
  onPlayEpisode: (ep: Episode) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);


  const seasonMeta = (detail?.seasons || []).filter((s) => s.season_number > 0);
  const selectedSeasonMeta = seasonMeta.find((s) => s.season_number === selectedSeason);
  const totalEpisodes = episodes.length || selectedSeasonMeta?.episode_count || 0;
  const watchedCount = watchedEpisodes.length;
  const remainingCount = Math.max(totalEpisodes - watchedCount, 0);
  const progressPercent = totalEpisodes ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
  const currentFilter = library.watching[String(item.id)]?.episodeFilter || "all";
  const visibleEpisodes = episodes.filter((ep) => {
    const w = watchedEpisodes.includes(ep.episode_number);
    if (currentFilter === "watched") return w;
    if (currentFilter === "unwatched") return !w;
    return true;
  });

  const openEpPicker = (ep: Episode) => {
    setCurrentEpisode(item.id, ep.episode_number, selectedSeason);
    setSelectedEpisode(ep.episode_number);
    onPlayEpisode(ep);
  };

  const handleContinue = () => {
    const watched = new Set(watchedEpisodes);
    const next = episodes.find((ep) => !watched.has(ep.episode_number)) ?? episodes[episodes.length - 1];
    if (next) openEpPicker(next);
    else continueToNextEpisode(item.id, selectedSeason, episodes.map((ep) => ep.episode_number));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="eqp-overlay"
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          {/* Dim backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          {/* Panel wrapper */}
          <div className="relative flex min-h-full flex-col sm:items-center sm:justify-center sm:p-6">
            <motion.div
              key="eqp-panel"
              className="relative w-full flex-1 overflow-y-auto bg-[#131316] sm:flex-none sm:max-w-5xl sm:rounded-2xl sm:max-h-[88vh] sm:border sm:border-white/[0.08] sm:shadow-[0_32px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)]"
              initial={{ y: 32, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Blurred backdrop atmosphere */}
              {backdropPath && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px]">
                  <img
                    src={`${BACKDROP_BASE}${backdropPath}`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ filter: "blur(70px)", transform: "scale(1.2)", opacity: 0.22 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#131316]/40 via-[#131316]/70 to-[#131316]" />
                </div>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close episode picker"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 backdrop-blur-sm transition hover:bg-black/70 hover:text-white sm:right-5 sm:top-5"
              >
                <X size={16} />
              </button>

              {/* Content */}
              <div className="relative px-4 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
                {/* Show label */}
                <div className="mb-6 flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/35">Series</span>
                  <span className="truncate text-[14px] font-semibold text-white/45">{title}</span>
                </div>

                {/* Season summary */}
                <div className="mb-6">
                  {/* Heading + selector + ambient % */}
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div className="flex items-end gap-4 min-w-0">
                      <h2 className="text-[34px] sm:text-[46px] font-black text-white leading-none tracking-[-0.02em] shrink-0">
                        Season {selectedSeason}
                      </h2>
                      {seasonMeta.length > 1 && (
                        <div className="mb-1">
                          <select
                            value={selectedSeason}
                            onChange={(e) => loadSeason(Number(e.target.value))}
                            className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/70 outline-none backdrop-blur-sm transition hover:bg-white/[0.09] cursor-pointer"
                          >
                            {seasonMeta.map((s) => {
                              const sw = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(s.season_number)]?.length || 0;
                              return (
                                <option key={s.season_number} value={s.season_number} style={{ background: "#111", color: "#fff" }}>
                                  S{s.season_number} — {sw}/{s.episode_count || 0} watched
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                    <span className="text-[44px] sm:text-[58px] font-black leading-none text-white/20 tracking-[-0.03em] shrink-0 select-none">{progressPercent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07] mb-3">
                    <motion.div
                      className="h-full rounded-full bg-white/55"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/30 mb-5">
                    <span>{watchedCount} watched</span>
                    <span className="text-white/10">·</span>
                    <span>{remainingCount} remaining</span>
                    <span className="text-white/10">·</span>
                    <span>{totalEpisodes} episodes</span>
                    {savedSelectedEpisode > 0 && (
                      <>
                        <span className="text-white/10">·</span>
                        <span className="text-amber-400/55 font-medium">S{selectedSeason}E{savedSelectedEpisode} current</span>
                      </>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleContinue}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-black transition hover:bg-white/90 active:scale-[0.97]"
                    >
                      <Play size={12} className="fill-black shrink-0" /> Continue
                    </button>
                    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur-sm">
                      {([{ key: "all", label: "All" }, { key: "watched", label: "Watched" }, { key: "unwatched", label: "Unwatched" }] as const).map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setEpisodeFilter(item.id, f.key)}
                          className={cn("rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition", currentFilter === f.key ? "bg-white/15 text-white" : "text-white/35 hover:text-white/60")}
                        >{f.label}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button onClick={() => markSeasonComplete(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))} className="rounded-lg border border-white/8 px-3 py-2 text-[11px] font-medium text-white/30 transition hover:border-white/15 hover:text-white/55">Complete</button>
                      <button onClick={() => clearSeasonEpisodes(item.id, selectedSeason)} className="rounded-lg border border-white/6 px-3 py-2 text-[11px] font-medium text-white/20 transition hover:text-red-400/60">Reset</button>
                    </div>
                  </div>
                </div>

                {/* ─── Vertical episode list ─── */}
                <div className="flex flex-col gap-1 px-4 sm:px-8 pb-8">
                  {visibleEpisodes.length === 0 && (
                    <div className="py-12 text-[13px] text-white/25 w-full text-center">
                      {episodes.length === 0 ? "Loading episodes…" : "No episodes match this filter."}
                    </div>
                  )}
                  {visibleEpisodes.map((ep, index) => {
                    const checked = watchedEpisodes.includes(ep.episode_number);
                    const isActive = savedSelectedEpisode === ep.episode_number;
                    const stillUrl = ep.still_path ? `https://image.tmdb.org/t/p/w400${ep.still_path}` : null;
                    return (
                      <motion.div
                        key={ep.episode_number}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.4) }}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl p-2 transition-colors cursor-pointer",
                          isActive ? "bg-amber-400/[0.04] ring-1 ring-inset ring-amber-400/20" : "hover:bg-white/[0.03]"
                        )}
                        onClick={() => openEpPicker(ep)}
                        role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEpPicker(ep); } }}
                      >
                        {/* Thumbnail */}
                        <div className={cn(
                          "relative shrink-0 w-[120px] sm:w-[148px] aspect-video overflow-hidden rounded-xl",
                          checked ? "opacity-55" : ""
                        )}>
                          {stillUrl
                            ? <img src={stillUrl} alt={ep.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                            : <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04]"><Film size={18} className="text-white/15" /></div>
                          }
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                          {/* Hover play */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25 backdrop-blur-sm shadow-lg">
                              <Play size={13} className="fill-white text-white ml-0.5" />
                            </div>
                          </div>
                          {/* Watched overlay */}
                          {checked && (
                            <div className="absolute inset-0 bg-black/40 pointer-events-none flex items-center justify-center">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                                <Check size={12} className="text-white/80" />
                              </div>
                            </div>
                          )}
                          {/* Episode number badge */}
                          <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm pointer-events-none">
                            <span className="text-[9px] font-bold text-white/65">{ep.episode_number}</span>
                          </div>
                          {/* Next Up badge */}
                          {isActive && !checked && (
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-0.5 pointer-events-none shadow-[0_3px_10px_rgba(251,191,36,0.35)]">
                              <Play size={6} className="fill-black text-black" />
                              <span className="text-[7px] font-black text-black uppercase tracking-wider">Next Up</span>
                            </div>
                          )}
                          {isActive && checked && (
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-white/12 border border-white/20 px-1.5 py-0.5 pointer-events-none backdrop-blur-sm">
                              <span className="text-[7px] font-bold text-white/65 uppercase tracking-wider">Current</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col flex-1 min-w-0 justify-center py-0.5 gap-0.5">
                          <p className="text-[13px] font-bold text-white leading-snug line-clamp-1">{ep.name}</p>
                          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                            {(ep.vote_average ?? 0) > 0 && (
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="rounded-sm bg-[#f5c518] px-[5px] py-px text-[9px] font-black text-black leading-none">IMDb</span>
                                <span className="text-[11px] font-semibold text-white/55">{(ep.vote_average!).toFixed(1)}</span>
                              </div>
                            )}
                            {ep.runtime ? <span className="text-[11px] text-white/30">{ep.runtime}m</span> : null}
                            {ep.air_date ? <span className="text-[11px] text-white/30">{ep.air_date.slice(0, 10)}</span> : null}
                          </div>
                          {ep.overview && (
                            <p className="mt-1 text-[12px] text-white/50 line-clamp-2 leading-relaxed">{ep.overview}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 py-0.5 pr-0.5" onClick={(e) => e.stopPropagation()}>
                          {ep.episode_number > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markEpisodesUpTo(item.id, selectedSeason, ep.episode_number); }}
                              title="Mark all previous as watched"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/20 transition hover:border-amber-400/40 hover:text-amber-400/70"
                            >
                              <ChevronLeft size={11} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleEpisode(item.id, ep.episode_number, selectedSeason); }}
                            aria-label={checked ? "Mark unwatched" : "Mark watched"}
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-90",
                              checked ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-white/15 text-white/25 hover:border-white/30 hover:text-white/50"
                            )}
                          >
                            <Check size={13} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailModal({
  open, item, mediaType, onClose, inWatchlist, inWatched, userRating,
  onToggleWatchlist, onToggleWatched, onRate, library, setWatchingSeason,
  toggleEpisode, setEpisodeFilter, setCurrentEpisode, continueToNextEpisode,
  markEpisodesUpTo, markSeasonComplete, clearSeasonEpisodes, onResolveLibraryItem,
  onOpenRelated, onToggleSimilarWatchlist, onToggleSimilarWatched,
  similarWatchlistKeys, similarWatchedKeys, ratingsMap, appLanguage,
  onOpenWatch, onSaveNote, userNote = "",
  followedPeople = [], onToggleFollowPerson,
}: {
  open: boolean; item: MediaItem | LibraryItem | null; mediaType: MediaType | null;
  onClose: () => void; inWatchlist: boolean; inWatched: boolean; userRating?: number;
  onToggleWatchlist: () => void; onToggleWatched: () => void; onRate: (rating: number) => void;
  library: UserLibrary; setWatchingSeason: (showId: number, season: number) => void;
  toggleEpisode: (showId: number, episode: number, season?: number) => void;
  setEpisodeFilter: (showId: number, filter: "all" | "watched" | "unwatched") => void;
  setCurrentEpisode: (showId: number, episode: number, season?: number) => void;
  continueToNextEpisode: (showId: number, season: number, episodeNumbers: number[]) => void;
  markEpisodesUpTo: (showId: number, season: number, episode: number) => void;
  markSeasonComplete: (showId: number, season: number, episodeNumbers: number[]) => void;
  clearSeasonEpisodes: (showId: number, season: number) => void;
  onResolveLibraryItem: (oldItem: LibraryItem, resolved: MediaItem, mediaType: MediaType) => void;
  onOpenRelated: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatched: (item: MediaItem, mediaType: MediaType) => void;
  similarWatchlistKeys: Set<string>; similarWatchedKeys: Set<string>;
  ratingsMap: Record<string, number>; appLanguage: AppLanguage;
  onOpenWatch: (payload: { url: string; title: string; mediaType: MediaType; tmdbId?: number; season?: number; episode?: number }) => void;
  onSaveNote: (key: string, note: string) => void; userNote?: string;
  followedPeople?: import("./types").FollowedPerson[];
  onToggleFollowPerson?: (person: import("./types").FollowedPerson) => void;
}) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [imdbData, setImdbData] = useState<IMDbTitleData | null>(null);
  const [omdbData, setOmdbData] = useState<OmdbData | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [watchProviders, setWatchProviders] = useState<{ flatrate?: WatchProvider[]; rent?: WatchProvider[]; free?: WatchProvider[] } | null>(null);
  const [watchmodeSources, setWatchmodeSources] = useState<Array<{ name: string; type: string; web_url: string; source_id: number }>>([]);
  const [personModalId, setPersonModalId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState(userNote || "");
  const [noteSaved, setNoteSaved] = useState(false);

  const [similarItems, setSimilarItems] = useState<MediaItem[]>([]);
  const similarSectionRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "episodes" | "similar" | "notes">("overview");
  const [episodePicker, setEpisodePicker] = useState<{
    number: number; season: number; name: string;
    runtime?: number; airDate?: string; stillPath?: string | null;
  } | null>(null);
  const [episodesQuickPickOpen, setEpisodesQuickPickOpen] = useState(false);

  // Use a ref so episode-toggle changes to library.watching don't re-run the heavy effect
  const watchingRef = useRef(library.watching);
  watchingRef.current = library.watching;
  // Track last opened item so we only reset the tab when a NEW item opens
  const lastOpenedItemIdRef = useRef<number | null>(null);
  // Horizontal scroll container for episode browser
  const episodeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      // Clear so next open (even same item) always runs full reset
      lastOpenedItemIdRef.current = null;
    };
  }, [open]);
  useEffect(() => {
    if (!open || !item || !mediaType) return;
    // Only reset per-item state when the item actually changes (not on every watching update)
    const isNewItem = item.id !== lastOpenedItemIdRef.current;
    lastOpenedItemIdRef.current = item.id;
    if (isNewItem) {
      setNoteText(userNote || "");
      setNoteSaved(false);
      setWatchProviders(null);
      setWatchmodeSources([]);
      setTrailerKey(null);
      setActiveTab("overview");
      // Clear stale data from previous item immediately
      setDetail(null);
      setEpisodes([]);
      setCast([]);
      setSimilarItems([]);
      setImdbData(null);
      setOmdbData(null);
    }

    const progress = watchingRef.current[String(item.id)];
    const nextSeason = progress?.season || 1;
    setSelectedSeason(nextSeason);
    setSelectedEpisode(progress?.selectedEpisodeBySeason?.[String(nextSeason)] || 1);

    let cancelled = false;

    const loadDetails = async () => {
      try {
        const baseId = item.id;
        const [d, videosRes, credits, recs] = await Promise.all([
          tmdbFetch<DetailData>(`/${mediaType}/${baseId}`, { append_to_response: mediaType === "tv" ? "credits,external_ids" : "credits" }),
          tmdbFetch<{ results: VideoResult[] }>(`/${mediaType}/${baseId}/videos`),
          tmdbFetch<{ cast: CastMember[] }>(`/${mediaType}/${baseId}/credits`),
          tmdbFetch<{ results: MediaItem[] }>(`/${mediaType}/${baseId}/recommendations`),
        ]);

        if (cancelled) return;
        setDetail(d);
                setCast(((d.credits?.cast || credits.cast || [])).slice(0, 12));
        setSimilarItems((recs.results || []).slice(0, 18));

        // Extract trailer key from videos
        const videos = videosRes.results || [];
        const trailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer")
          || videos.find(v => v.site === "YouTube" && v.type === "Teaser")
          || videos.find(v => v.site === "YouTube");
        if (!cancelled) setTrailerKey(trailer?.key || null);

        // Fetch watch providers (where to stream)
        const tmdbIdForProviders = d.id || baseId;
        fetchWatchProviders(mediaType, tmdbIdForProviders)
          .then((res) => {
            if (!cancelled && res) {
              const regionData = res.results?.US || res.results?.GB || Object.values(res.results || {})[0] || null;
              setWatchProviders(regionData ? { flatrate: regionData.flatrate, rent: regionData.rent, free: regionData.free } : null);
            }
          }).catch(() => {});

        // Fetch Watchmode streaming sources
        fetchWatchmodeSources(tmdbIdForProviders, mediaType === "movie" ? "movie" : "tv")
          .then((srcs) => { if (!cancelled) setWatchmodeSources(Array.isArray(srcs) ? srcs : []); })
          .catch(() => {});

        const imdbId = d.imdb_id || d.external_ids?.imdb_id;
        if (imdbId) {
          const [imdb, omdb] = await Promise.all([
            imdbFetchTitle(imdbId),
            omdbFetch({ i: imdbId, plot: "full" }),
          ]);
          if (!cancelled) { setImdbData(imdb); setOmdbData(omdb); }
        } else if (!cancelled) {
          setImdbData(null);
          setOmdbData(null);
        }

        if (mediaType === "tv") {
          try {
            const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${d.id || baseId}/season/${nextSeason}`);
            if (!cancelled) setEpisodes(seasonData.episodes || []);
          } catch {
            if (!cancelled) setEpisodes([]);
          }
        }
        return;
      } catch {
        if (!("mediaType" in item)) {
          if (!cancelled) {
            setDetail(null);
                        setEpisodes([]);
            setCast([]);
            setImdbData(null);
            setSimilarItems([]);
          }
          return;
        }
      }

      try {
        const match = await searchTMDBMatchForLibraryItem(item as LibraryItem);
        if (!match || cancelled) {
          if (!cancelled) {
            setDetail(null);
                        setEpisodes([]);
            setCast([]);
            setSimilarItems([]);
          }
          return;
        }

        onResolveLibraryItem(item as LibraryItem, match, mediaType);

        const [d, videosRes2, credits, recs] = await Promise.all([
          tmdbFetch<DetailData>(`/${mediaType}/${match.id}`, { append_to_response: mediaType === "tv" ? "credits,external_ids" : "credits" }),
          tmdbFetch<{ results: VideoResult[] }>(`/${mediaType}/${match.id}/videos`),
          tmdbFetch<{ cast: CastMember[] }>(`/${mediaType}/${match.id}/credits`),
          tmdbFetch<{ results: MediaItem[] }>(`/${mediaType}/${match.id}/recommendations`),
        ]);

        if (cancelled) return;
        setDetail(d);
        setCast(((d.credits?.cast || credits.cast || [])).slice(0, 12));
        setSimilarItems((recs.results || []).slice(0, 18));

        // Extract trailer key
        const videos2 = videosRes2.results || [];
        const trailer2 = videos2.find(v => v.site === "YouTube" && v.type === "Trailer")
          || videos2.find(v => v.site === "YouTube" && v.type === "Teaser")
          || videos2.find(v => v.site === "YouTube");
        if (!cancelled) setTrailerKey(trailer2?.key || null);

        const imdbId = d.imdb_id || d.external_ids?.imdb_id;
        if (imdbId) {
          const [imdb, omdb] = await Promise.all([
            imdbFetchTitle(imdbId),
            omdbFetch({ i: imdbId, plot: "full" }),
          ]);
          if (!cancelled) { setImdbData(imdb); setOmdbData(omdb); }
        } else if (!cancelled) {
          setImdbData(null);
          setOmdbData(null);
        }

        if (mediaType === "tv") {
          try {
            const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${match.id}/season/${nextSeason}`);
            if (!cancelled) setEpisodes(seasonData.episodes || []);
          } catch {
            if (!cancelled) setEpisodes([]);
          }
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
                    setEpisodes([]);
          setCast([]);
          setImdbData(null);
          setSimilarItems([]);
        }
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, mediaType, onResolveLibraryItem]);

  const loadSeason = useCallback(async (season: number) => {
    if (!item || mediaType !== "tv") return;
    const resolvedShowId = detail?.id || item.id;
    setSelectedSeason(season);
    setWatchingSeason(item.id, season);
    try {
      const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${resolvedShowId}/season/${season}`);
      const nextEpisodes = seasonData.episodes || [];
      setEpisodes(nextEpisodes);
      const savedEpisode = watchingRef.current[String(item.id)]?.selectedEpisodeBySeason?.[String(season)];
      setSelectedEpisode(savedEpisode || nextEpisodes[0]?.episode_number || 1);
    } catch {
      setEpisodes([]);
      setSelectedEpisode(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, mediaType, setWatchingSeason, detail?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item || !mediaType) return null;

  // ── Derived values ────────────────────────────────────────────
  const display = detail || item;
  const title = "title" in display || "name" in display ? getTitle(display as DetailData) : (display as LibraryItem).title;
  const backdropPath = (detail?.backdrop_path ?? ("backdropPath" in item ? item.backdropPath : item.backdrop_path)) || null;
  const posterPath = detail?.poster_path || ("poster_path" in item ? item.poster_path : null) || ("posterPath" in item ? item.posterPath : null);
  const watchedEpisodes = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(selectedSeason)] || [];
  const savedSelectedEpisode = library.watching[String(item.id)]?.selectedEpisodeBySeason?.[String(selectedSeason)] || 1;
  const tmdbScore = ((detail?.vote_average ?? ("rating" in item ? item.rating : 0)) || 0).toFixed(1);
  const imdbScoreValue = extractIMDbRating(imdbData);
  const imdbVotes = extractIMDbVotes(imdbData);
  const omdbImdbRating = omdbData?.imdbRating && omdbData.imdbRating !== "N/A" ? omdbData.imdbRating : null;
  const displayScore = imdbScoreValue ?? (omdbImdbRating ? parseFloat(omdbImdbRating) : Number(tmdbScore));
  const score = displayScore.toFixed(1);
  const rtRating = omdbData?.Ratings?.find(r => r.Source === "Rotten Tomatoes")?.Value ?? null;
  const metacriticScore = omdbData?.Ratings?.find(r => r.Source === "Metacritic")?.Value ?? (omdbData?.Ratings && null);
  const omdbAwards = omdbData?.Awards && omdbData.Awards !== "N/A" ? omdbData.Awards : null;
  const boxOffice = omdbData?.BoxOffice && omdbData.BoxOffice !== "N/A" ? omdbData.BoxOffice : null;
  const omdbWriter = omdbData?.Writer && omdbData.Writer !== "N/A" ? omdbData.Writer : null;
  const genreText = detail?.genres?.map((g) => g.name).join(", ") || (mediaType === "movie" ? "Action, Science Fiction, Thriller" : "Drama, Sci-Fi");
  const genreList = detail?.genres || [];
  const releaseDate = detail?.release_date || detail?.first_air_date || "—";
  const runtimeText = detail?.runtime ? `${detail.runtime} min` : mediaType === "movie" ? "—" : null;
  const languageText = detail?.original_language ? detail.original_language.toUpperCase() : "—";
  const studioText = detail?.production_companies?.[0]?.name || "Unknown";
  const directorCrewMember = detail?.credits?.crew?.find((person) => person.job === "Director") || null;
  const directorText = directorCrewMember?.name || "Unknown";
  const resolvedTmdbId = detail?.id || (!('mediaType' in item) ? item.id : null);
  const currentEpisodeNumber = selectedEpisode || savedSelectedEpisode || episodes[0]?.episode_number || 1;
  const canWatch = Boolean(resolvedTmdbId);
  const castForDisplay = cast.filter((person) => person.name).slice(0, 12);
  const yearDisplay = getYear(display as DetailData);
  const tabs: Array<{ key: typeof activeTab; label: string }> = [{ key: "overview", label: "Overview" }];
  if (mediaType === "tv") tabs.push({ key: "episodes", label: "Episodes" });
  if (similarItems.length) tabs.push({ key: "similar", label: "Similar" });
  tabs.push({ key: "notes", label: "Notes" });

  // ── Phone: immersive slide-up detail panel ────────────────────────────────
  if (IS_MOBILE) {
    return (
      <>
        <MobileDetailPanel
          open={open}
          title={title}
          backdropPath={backdropPath}
          posterPath={posterPath}
          mediaType={mediaType}
          yearDisplay={yearDisplay}
          genreList={genreList}
          genreText={genreText}
          displayScore={displayScore}
          imdbScoreValue={imdbScoreValue}
          imdbVotes={imdbVotes}
          rtRating={rtRating}
          metacriticScore={metacriticScore as string | null}
          runtimeText={runtimeText}
          releaseDate={releaseDate}
          languageText={languageText}
          directorText={directorText}
          studioText={studioText}
          overview={detail?.overview || ("overview" in item ? (item as MediaItem).overview : undefined) || "No overview available."}
          omdbAwards={omdbAwards}
          trailerKey={trailerKey}
          castForDisplay={castForDisplay}
          similarItems={similarItems}
          episodes={episodes}
          selectedSeason={selectedSeason}
          seasonsMeta={(detail?.seasons || []).filter((s) => s.season_number > 0)}
          watchedEpisodes={watchedEpisodes}
          currentEpisodeNumber={currentEpisodeNumber}
          watchProviders={watchProviders}
          inWatchlist={inWatchlist}
          inWatched={inWatched}
          userRating={userRating}
          canWatch={canWatch}
          similarWatchlistKeys={similarWatchlistKeys}
          similarWatchedKeys={similarWatchedKeys}
          onClose={onClose}
          onWatchNow={() =>
            mediaType === "tv"
              ? setEpisodesQuickPickOpen(true)
              : onOpenWatch({ url: "", title, mediaType, tmdbId: resolvedTmdbId || undefined })
          }
          onToggleWatchlist={onToggleWatchlist}
          onToggleWatched={onToggleWatched}
          onRate={onRate}
          onSeasonChange={loadSeason}
          onOpenRelated={onOpenRelated}
          onToggleSimilarWatchlist={onToggleSimilarWatchlist}
          onToggleSimilarWatched={onToggleSimilarWatched}
        />
        {item && mediaType === "tv" && (
          <EpisodesQuickPickModal
            open={episodesQuickPickOpen}
            onClose={() => setEpisodesQuickPickOpen(false)}
            item={item}
            detail={detail}
            backdropPath={backdropPath}
            title={title}
            episodes={episodes}
            selectedSeason={selectedSeason}
            loadSeason={loadSeason}
            savedSelectedEpisode={savedSelectedEpisode}
            watchedEpisodes={watchedEpisodes}
            library={library}
            setCurrentEpisode={setCurrentEpisode}
            setSelectedEpisode={setSelectedEpisode}
            setEpisodeFilter={setEpisodeFilter}
            toggleEpisode={toggleEpisode}
            markEpisodesUpTo={markEpisodesUpTo}
            markSeasonComplete={markSeasonComplete}
            clearSeasonEpisodes={clearSeasonEpisodes}
            continueToNextEpisode={continueToNextEpisode}
            onPlayEpisode={(ep) => {
              const serverKey = (() => { try { return (localStorage.getItem("gf_preferred_server") as ServerKey) || "superembed"; } catch { return "superembed"; } })();
              const server = SERVERS.find(s => s.key === serverKey) ?? SERVERS[0];
              const url = server.buildUrl({ type: "tv", tmdbId: item.id, season: selectedSeason, episode: ep.episode_number });
              onOpenWatch({ url, title, mediaType: "tv", tmdbId: item.id, season: selectedSeason, episode: ep.episode_number });
            }}
          />
        )}
      </>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto bg-black" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()} className="min-h-screen bg-[#0a0a0a]">
          {/* ══════ HERO ══════ */}
          <div className="relative">
            <div className="relative h-[52vw] min-h-[240px] max-h-[320px] overflow-hidden sm:h-[420px] sm:max-h-none md:h-[520px] lg:h-[580px]">
              {backdropPath ? (
                <motion.img initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}
                  src={`${BACKDROP_BASE}${backdropPath}`} alt={title} className="absolute inset-0 h-full w-full object-cover" />
              ) : <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a]" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[#0a0a0a]/20" />
            </div>
            <div className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-xl transition-all hover:bg-black/60 hover:text-white active:scale-90 sm:h-12 sm:w-12"><ChevronLeft size={22} /></button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10">
              <div className="mx-auto max-w-[1280px]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7 md:gap-9">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }} className="hidden shrink-0 sm:block">
                    <div className="w-[140px] overflow-hidden rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 md:w-[170px] lg:w-[200px]">
                      {posterPath ? <img src={`${POSTER_BASE}${posterPath}`} alt={title} className="aspect-[2/3] w-full object-cover" />
                        : <div className="flex aspect-[2/3] w-full items-center justify-center bg-[#1a1a2e] text-white/20"><Film size={40} /></div>}
                    </div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#e50914] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">{mediaType === "tv" ? "TV Series" : "Movie"}</span>
                      {genreList.slice(0, 3).map((g) => <span key={g.id} className="rounded-full border border-[#e50914]/30 bg-[#e50914]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff6b6b] sm:text-[11px]">{g.name}</span>)}
                      {!genreList.length && genreText && <span className="text-[11px] text-white/40">{genreText}</span>}
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-[26px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[36px] md:text-[48px] lg:text-[56px]">
                      {title}{yearDisplay && yearDisplay !== "—" && <span className="ml-3 text-[20px] font-normal text-white/30 sm:text-[26px] md:text-[34px]">({yearDisplay})</span>}
                    </motion.h1>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-white/50 sm:gap-4 sm:text-[13px]">
                      {directorText !== "Unknown" && <span className="text-white/60"><span className="text-white/30">Director:</span> <span className="font-medium text-white/75">{directorText}</span></span>}
                      {omdbWriter && <span className="text-white/60"><span className="text-white/30">Writers:</span> <span className="font-medium text-white/75">{omdbWriter}</span></span>}
                      {runtimeText && runtimeText !== "—" && <span className="flex items-center gap-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-white/30"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>{runtimeText}</span>}
                      <span>{releaseDate}</span><span>{languageText}</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3">
                        <RatingRing score={displayScore} size={56} />
                        <div className="flex flex-col"><span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{imdbScoreValue ? "IMDb" : "TMDB"}</span>
                          {imdbVotes ? <span className="text-[11px] text-white/25">{imdbVotes.toLocaleString()} votes</span> : null}</div>
                      </div>
                      {rtRating && <div className="flex items-center gap-1.5 rounded-lg border border-[#f97316]/20 bg-[#f97316]/8 px-3 py-1.5"><span className="text-[14px]">🍅</span><span className="text-[13px] font-bold text-[#f97316]">{rtRating}</span></div>}
                      {metacriticScore && <div className="flex items-center gap-1.5 rounded-lg border border-[#6ee7b7]/20 bg-[#6ee7b7]/8 px-3 py-1.5"><span className="text-[11px] font-bold text-[#6ee7b7]/60">MC</span><span className="text-[13px] font-bold text-[#6ee7b7]">{metacriticScore}</span></div>}
                      <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                        <Star size={12} className={typeof userRating === "number" ? "fill-[#efb43f] text-[#efb43f]" : "text-white/30"} />
                        <span className="text-[12px] font-semibold text-white/60">Your: {typeof userRating === "number" ? `${(userRating / 2).toFixed(1)}/5` : "—"}</span>
                      </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
                      {canWatch ? (
                        <button
                          onClick={() => mediaType === "tv" ? setEpisodesQuickPickOpen(true) : onOpenWatch({ url: "", title, mediaType, tmdbId: resolvedTmdbId || undefined })}
                          className="group inline-flex h-11 items-center gap-2.5 rounded-lg bg-[#e50914] px-6 text-[14px] font-bold uppercase tracking-wider text-white shadow-[0_8px_30px_rgba(229,9,20,0.35)] transition-all hover:bg-[#f40612] hover:shadow-[0_8px_40px_rgba(229,9,20,0.5)] active:scale-95 sm:h-12 sm:px-8 sm:text-[15px]">
                          <Play size={16} className="fill-white transition-transform group-hover:scale-110" />
                          {mediaType === "tv" ? "Watch Now" : "Watch Now"}
                        </button>
                      ) : <div className="inline-flex h-11 items-center gap-2.5 rounded-lg bg-white/10 px-6 text-[14px] font-bold uppercase tracking-wider text-white/30 sm:h-12 sm:px-8"><Play size={16} className="fill-white/30" /> Loading...</div>}
                      {trailerKey && (
                        <a href={`https://www.youtube.com/watch?v=${trailerKey}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-5 text-[13px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95 sm:h-12 sm:text-[14px]">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#ff0000]" xmlns="http://www.w3.org/2000/svg"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>Trailer</a>
                      )}
                      <button onClick={onToggleWatchlist} title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                        className={cn("inline-flex h-11 w-11 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-90 sm:h-12 sm:w-12", inWatchlist ? "border-[#efb43f]/50 bg-[#efb43f] text-black shadow-[0_4px_20px_rgba(239,180,63,0.3)]" : "border-white/12 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white")}>
                        <Bookmark size={17} className={inWatchlist ? "fill-black" : ""} /></button>
                      <button onClick={onToggleWatched} title={inWatched ? "Mark as Unwatched" : "Mark as Watched"}
                        className={cn("inline-flex h-11 w-11 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-90 sm:h-12 sm:w-12", inWatched ? "border-emerald-500/50 bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]" : "border-white/12 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white")}>
                        <Eye size={17} /></button>
                      <InlineRatingControl value={userRating} onChange={onRate} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ TABS ══════ */}
          <div className="sticky top-0 z-20 border-b border-white/6 bg-[#0a0a0a]/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1280px] items-center gap-0 overflow-x-auto px-4 sm:px-6 lg:px-10">
              {tabs.map((tab) => <DetailTab key={tab.key} label={tab.label} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />)}
            </div>
          </div>
          <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-10">
            <AnimatePresence mode="sync">
              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <h3 className="mb-3 text-[15px] font-bold uppercase tracking-wider text-white/30 sm:text-[16px]">{tr(appLanguage, "synopsis")}</h3>
                      <p className="text-[14px] leading-7 text-white/65 sm:text-[15px] sm:leading-8">{detail?.overview || ("overview" in item ? item.overview : "") || "No overview available."}</p>
                      {omdbAwards && <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#efb43f]/15 bg-[#efb43f]/5 p-4"><span className="mt-0.5 text-[18px]">🏆</span><div><div className="text-[12px] font-bold uppercase tracking-wider text-[#efb43f]/60">Nominations & Awards</div><div className="mt-1 text-[13px] font-medium text-[#efb43f]/90">{omdbAwards}</div></div></div>}
                      {watchProviders && (watchProviders.flatrate?.length || watchProviders.rent?.length || watchProviders.free?.length) ? (
                        <div className="mt-5"><div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-white/25">Available On</div>
                          <div className="flex flex-wrap gap-2">{[...(watchProviders.flatrate || []), ...(watchProviders.free || []), ...(watchProviders.rent || [])].slice(0, 8).map((p, i) => <img key={`${p.provider_id}-${i}`} src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className="h-10 w-10 rounded-lg ring-1 ring-white/10 transition hover:ring-white/30" />)}</div></div>
                      ) : null}
                      {watchmodeSources.filter(s => s.type === "sub").length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/25">Stream Now</div>
                          <div className="flex flex-wrap gap-2">
                            {watchmodeSources.filter(s => s.type === "sub").slice(0, 8).map(s => (
                              <a key={s.source_id} href={s.web_url} target="_blank" rel="noopener noreferrer"
                                className="rounded-lg bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold text-white/65 transition hover:bg-white/[0.13] hover:text-white">
                                {s.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 sm:p-6">
                      <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-white/30 sm:text-[16px]"><span className="h-4 w-[2px] rounded-full bg-[#e50914]" />{tr(appLanguage, "details")}</h3>
                      <div className="space-y-3 text-[13px] sm:text-[14px]">
                        {[
                          ["IMDb", <><span className="text-[#efb43f] font-bold">{score}</span> {imdbVotes ? <span className="text-white/25 ml-1">{imdbVotes.toLocaleString()} votes</span> : omdbData?.imdbVotes && omdbData.imdbVotes !== "N/A" ? <span className="text-white/25 ml-1">{omdbData.imdbVotes}</span> : null}</>],
                          rtRating ? ["Rotten Tomatoes", <span className="font-semibold text-[#f97316]">🍅 {rtRating}</span>] : null,
                          metacriticScore ? ["Metacritic", <span className="font-semibold text-[#6ee7b7]">{metacriticScore}</span>] : null,
                          [tr(appLanguage, "year"), <span className="font-semibold text-white">{yearDisplay}</span>],
                          runtimeText ? [tr(appLanguage, "runtime"), <span className="font-semibold text-white">{runtimeText}</span>] : null,
                          [tr(appLanguage, "genres"), <span className="font-semibold text-white">{genreText}</span>],
                          [tr(appLanguage, "languageLabel"), <span className="font-semibold text-white">{languageText}</span>],
                          [tr(appLanguage, "studio"), <span className="font-semibold text-white">{studioText}</span>],
                          [tr(appLanguage, "director"), (() => {
                            const displayName = directorText !== "Unknown" ? directorText : (omdbData?.Director && omdbData.Director !== "N/A" ? omdbData.Director : directorText);
                            return directorCrewMember?.id ? (
                              <button onClick={() => setPersonModalId(directorCrewMember.id)} className="font-semibold text-[#efb43f] transition hover:underline hover:brightness-110">{displayName}</button>
                            ) : (
                              <span className="font-semibold text-white">{displayName}</span>
                            );
                          })()],
                          omdbWriter ? ["Writer", <span className="font-semibold text-white">{omdbWriter}</span>] : null,
                          [tr(appLanguage, "release"), <span className="font-semibold text-white">{releaseDate}</span>],
                          boxOffice ? ["Box Office", <span className="font-semibold text-[#22c55e]">{boxOffice}</span>] : null,
                        ].filter(Boolean).map((row, i) => (
                          <div key={i} className="flex justify-between gap-4 border-b border-white/[0.04] pb-2.5 last:border-0 last:pb-0"><span className="shrink-0 text-white/35">{(row as any[])[0]}</span><span className="text-right">{(row as any[])[1]}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {castForDisplay.length > 0 && (
                    <div className="mt-8">
                      <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-white/30 sm:text-[16px]"><span className="h-4 w-[2px] rounded-full bg-[#e50914]" />Cast</h3>
                      <div className="flex gap-3 overflow-x-auto pb-3 sm:gap-4" style={{ scrollbarWidth: "none" }}>
                        {castForDisplay.map((person, index) => (
                          <motion.button key={person.id} onClick={() => setPersonModalId(person.id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.25 }}
                            className="group flex shrink-0 flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-white/[0.04] cursor-pointer w-[90px] sm:w-[100px]">
                            <div className="h-16 w-16 overflow-hidden rounded-full bg-[#1a1a2e] ring-2 ring-white/8 transition group-hover:ring-[#e50914]/40 sm:h-[72px] sm:w-[72px]">
                              {person.profile_path ? <img src={`${POSTER_BASE}${person.profile_path}`} alt={person.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                : <div className="flex h-full w-full items-center justify-center text-white/20"><User size={20} /></div>}
                            </div>
                            <div className="w-full text-center"><div className="truncate text-[11px] font-semibold text-white/80 sm:text-[12px]">{person.name}</div><div className="truncate text-[10px] text-white/30">{person.character || "Cast"}</div></div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── EPISODES TAB ── */}
              {activeTab === "episodes" && mediaType === "tv" && (() => {
                const seasonMeta = (detail?.seasons || []).filter((s) => s.season_number > 0);
                const selectedSeasonMeta = seasonMeta.find((s) => s.season_number === selectedSeason);
                const totalEpisodes = episodes.length || selectedSeasonMeta?.episode_count || 0;
                const watchedCount = watchedEpisodes.length;
                const remainingCount = Math.max(totalEpisodes - watchedCount, 0);
                const progressPercent = totalEpisodes ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
                const currentFilter = library.watching[String(item.id)]?.episodeFilter || "all";
                const visibleEpisodes = episodes.filter((ep) => {
                  const isWatched = watchedEpisodes.includes(ep.episode_number);
                  if (currentFilter === "watched") return isWatched;
                  if (currentFilter === "unwatched") return !isWatched;
                  return true;
                });
                const openEpPicker = (ep: Episode) => {
                  setCurrentEpisode(item.id, ep.episode_number, selectedSeason);
                  setSelectedEpisode(ep.episode_number);
                  const serverKey = (() => { try { return (localStorage.getItem("gf_preferred_server") as ServerKey) || "superembed"; } catch { return "superembed"; } })();
                  const server = SERVERS.find(s => s.key === serverKey) ?? SERVERS[0];
                  const url = server.buildUrl({ type: "tv", tmdbId: item.id, season: selectedSeason, episode: ep.episode_number });
                  onOpenWatch({ url, title, mediaType: "tv", tmdbId: item.id, season: selectedSeason, episode: ep.episode_number });
                };
                return (
                  <motion.div key="episodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

                    {/* ═══ ATMOSPHERIC HEADER ZONE ═══ */}
                    <div className="relative -mx-4 sm:-mx-6 lg:-mx-10 mb-0 overflow-hidden">
                      {/* Blurred backdrop atmosphere */}
                      {backdropPath && (
                        <div className="pointer-events-none absolute inset-0">
                          <img
                            src={`${BACKDROP_BASE}${backdropPath}`}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            style={{ filter: "blur(60px)", transform: "scale(1.15)", opacity: 0.18 }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/50 via-[#0a0a0a]/70 to-[#0a0a0a]" />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/40 via-transparent to-[#0a0a0a]/40" />
                        </div>
                      )}

                      <div className="relative px-4 sm:px-6 lg:px-10 pt-8 pb-10 sm:pt-10">
                        {/* Top row: Season heading + season selector */}
                        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                          <div className="flex items-end gap-4 min-w-0">
                            <h2 className="text-[38px] sm:text-[52px] font-black text-white leading-none tracking-[-0.02em] shrink-0">
                              Season {selectedSeason}
                            </h2>
                            {seasonMeta.length > 1 && (
                              <div className="mb-1">
                                <select
                                  value={selectedSeason}
                                  onChange={(e) => loadSeason(Number(e.target.value))}
                                  className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/70 outline-none backdrop-blur-sm transition hover:bg-white/[0.09] cursor-pointer"
                                >
                                  {seasonMeta.map((s) => {
                                    const sw = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(s.season_number)]?.length || 0;
                                    return <option key={s.season_number} value={s.season_number} style={{ background: "#111", color: "#fff" }}>S{s.season_number} — {sw}/{s.episode_count || 0} watched</option>;
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                          {/* % completion — large ambient text */}
                          <span className="text-[52px] sm:text-[68px] font-black leading-none text-white/[0.07] tracking-[-0.03em] shrink-0 select-none">
                            {progressPercent}%
                          </span>
                        </div>

                        {/* Progress bar — full width, prominent */}
                        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08] mb-4">
                          <motion.div
                            className="h-full rounded-full bg-white/60"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                          />
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/35 mb-7">
                          <span className="font-semibold text-white/55">{watchedCount} watched</span>
                          <span className="text-white/15">·</span>
                          <span>{remainingCount} remaining</span>
                          <span className="text-white/15">·</span>
                          <span>{totalEpisodes} episodes</span>
                          {savedSelectedEpisode > 0 && (
                            <>
                              <span className="text-white/15">·</span>
                              <span className="text-amber-400/60 font-medium">S{selectedSeason}E{savedSelectedEpisode} current</span>
                            </>
                          )}
                        </div>

                        {/* Controls — single clean row */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            onClick={() => continueToNextEpisode(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-black transition hover:bg-white/90 active:scale-[0.97]"
                          >
                            <Play size={12} className="fill-black shrink-0" />
                            Continue
                          </button>
                          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur-sm">
                            {([{ key: "all", label: "All" }, { key: "watched", label: "Watched" }, { key: "unwatched", label: "Unwatched" }] as const).map((f) => (
                              <button
                                key={f.key}
                                onClick={() => setEpisodeFilter(item.id, f.key)}
                                className={cn(
                                  "rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition",
                                  currentFilter === f.key ? "bg-white/15 text-white" : "text-white/35 hover:text-white/60"
                                )}
                              >{f.label}</button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button onClick={() => markSeasonComplete(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))} className="rounded-lg border border-white/8 bg-transparent px-3 py-2 text-[11px] font-medium text-white/35 transition hover:border-white/15 hover:text-white/60">Complete</button>
                            <button onClick={() => clearSeasonEpisodes(item.id, selectedSeason)} className="rounded-lg border border-white/6 bg-transparent px-3 py-2 text-[11px] font-medium text-white/20 transition hover:text-red-400/60">Reset</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ═══ VERTICAL EPISODE LIST ═══ */}
                    <div className="flex flex-col gap-1 px-4 sm:px-6 lg:px-10 pb-10">
                      {!visibleEpisodes.length && (
                        <div className="flex min-h-[180px] w-full items-center justify-center py-10 text-[13px] text-white/25">
                          No episodes in this filter.
                        </div>
                      )}
                      {visibleEpisodes.map((ep, index) => {
                        const checked = watchedEpisodes.includes(ep.episode_number);
                        const isActive = savedSelectedEpisode === ep.episode_number;
                        const stillUrl = ep.still_path ? `https://image.tmdb.org/t/p/w400${ep.still_path}` : null;
                        return (
                          <motion.div
                            key={ep.episode_number}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.4) }}
                            className={cn(
                              "group flex items-start gap-3 sm:gap-4 rounded-xl p-2 sm:p-2.5 transition-colors cursor-pointer",
                              isActive ? "bg-amber-400/[0.04] ring-1 ring-inset ring-amber-400/20" : "hover:bg-white/[0.03]"
                            )}
                            onClick={() => openEpPicker(ep)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEpPicker(ep); } }}
                          >
                            {/* Thumbnail */}
                            <div className={cn(
                              "relative shrink-0 w-[130px] sm:w-[160px] lg:w-[175px] aspect-video overflow-hidden rounded-xl",
                              checked ? "opacity-55" : ""
                            )}>
                              {stillUrl ? (
                                <img src={stillUrl} alt={ep.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04]">
                                  <Film size={22} className="text-white/15" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                              {/* Hover play icon */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm shadow-xl">
                                  <Play size={15} className="fill-white text-white ml-0.5" />
                                </div>
                              </div>
                              {/* Watched overlay */}
                              {checked && (
                                <div className="absolute inset-0 bg-black/40 pointer-events-none flex items-center justify-center">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                                    <Check size={14} className="text-white/80" />
                                  </div>
                                </div>
                              )}
                              {/* Episode number */}
                              <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm pointer-events-none">
                                <span className={cn("text-[9px] font-bold", isActive ? "text-amber-300" : "text-white/65")}>{ep.episode_number}</span>
                              </div>
                              {/* Next Up badge */}
                              {isActive && !checked && (
                                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-0.5 pointer-events-none shadow-[0_3px_10px_rgba(251,191,36,0.4)]">
                                  <Play size={7} className="fill-black text-black" />
                                  <span className="text-[7px] font-black text-black uppercase tracking-wider">Next Up</span>
                                </div>
                              )}
                              {isActive && checked && (
                                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-white/12 border border-white/20 px-1.5 py-0.5 pointer-events-none backdrop-blur-sm">
                                  <span className="text-[7px] font-bold text-white/65 uppercase tracking-wider">Current</span>
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex flex-col flex-1 min-w-0 justify-center py-0.5 gap-0.5">
                              <p className="text-[13px] sm:text-[14px] font-bold text-white leading-snug line-clamp-1">{ep.name}</p>
                              <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                                {(ep.vote_average ?? 0) > 0 && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="rounded-sm bg-[#f5c518] px-[5px] py-px text-[9px] font-black text-black leading-none">IMDb</span>
                                    <span className="text-[11px] font-semibold text-white/55">{(ep.vote_average!).toFixed(1)}</span>
                                  </div>
                                )}
                                {ep.runtime ? <span className="text-[11px] text-white/30">{ep.runtime}m</span> : null}
                                {ep.air_date ? <span className="text-[11px] text-white/30">{ep.air_date.slice(0, 10)}</span> : null}
                              </div>
                              {ep.overview && (
                                <p className="mt-1 text-[12px] text-white/50 line-clamp-2 leading-relaxed">{ep.overview}</p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 py-0.5 pr-0.5" onClick={(e) => e.stopPropagation()}>
                              {ep.episode_number > 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); markEpisodesUpTo(item.id, selectedSeason, ep.episode_number); }}
                                  title="Mark all previous as watched"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/20 transition hover:border-amber-400/40 hover:text-amber-400/70"
                                >
                                  <ChevronLeft size={11} />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleEpisode(item.id, ep.episode_number, selectedSeason); }}
                                aria-label={checked ? "Mark unwatched" : "Mark watched"}
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-90",
                                  checked ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-white/15 text-white/25 hover:border-white/30 hover:text-white/50"
                                )}
                              >
                                <Check size={13} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })()}

              {/* ── SIMILAR TAB ── */}
              {activeTab === "similar" && similarItems.length > 0 && (
                <motion.div key="similar" ref={similarSectionRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <h3 className="mb-5 flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-white/30 sm:text-[16px]"><span className="h-4 w-[2px] rounded-full bg-[#e50914]" />You may also like</h3>
                  <Grid items={similarItems} mediaType={mediaType} onOpen={(nextItem, nextType) => onOpenRelated(nextItem as MediaItem, nextType)} onToggleWatchlist={(nextItem, nextType) => onToggleSimilarWatchlist(nextItem as MediaItem, nextType)} onToggleWatched={(nextItem, nextType) => onToggleSimilarWatched(nextItem as MediaItem, nextType)} watchlistKeys={similarWatchlistKeys} watchedKeys={similarWatchedKeys} ratings={ratingsMap} />
                </motion.div>
              )}

              {/* ── NOTES TAB ── */}
              {activeTab === "notes" && (
                <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="max-w-2xl">
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[15px] font-bold uppercase tracking-wider text-white/30 sm:text-[16px]"><span className="h-4 w-[2px] rounded-full bg-[#efb43f]" />My Notes</h3>
                      {noteSaved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium"><Check size={11} /> Saved</motion.span>}
                    </div>
                    <textarea value={noteText} onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false); }} placeholder={`Write your thoughts on "${title}"...`} rows={6}
                      className="w-full resize-none rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3 text-[14px] text-white/80 outline-none placeholder:text-white/18 focus:border-[#efb43f]/25 focus:bg-white/[0.05] transition" />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-white/18">{noteText.length} characters</span>
                      <button onClick={() => { if (item && mediaType) { const itemKey = keyFor({ id: item.id, mediaType: "mediaType" in item ? item.mediaType : mediaType }); onSaveNote(itemKey, noteText); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2500); } }}
                        className="rounded-lg bg-[#efb43f] px-5 py-2 text-[12px] font-bold text-black transition hover:brightness-110 active:scale-95">Save Note</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
      <PersonModal
        open={personModalId !== null}
        personId={personModalId}
        onClose={() => setPersonModalId(null)}
        onOpenItem={(item, mediaType) => { setPersonModalId(null); onOpenRelated(item, mediaType); }}
        isFollowed={(followedPeople ?? []).some(p => p.id === personModalId)}
        onToggleFollow={(person) => onToggleFollowPerson?.({ id: person.id, name: person.name, profilePath: person.profilePath, knownFor: person.knownFor })}
      />
      {item && mediaType === "tv" && (
        <EpisodesQuickPickModal
          open={episodesQuickPickOpen}
          onClose={() => setEpisodesQuickPickOpen(false)}
          item={item}
          detail={detail}
          backdropPath={backdropPath}
          title={title}
          episodes={episodes}
          selectedSeason={selectedSeason}
          loadSeason={loadSeason}
          savedSelectedEpisode={savedSelectedEpisode}
          watchedEpisodes={watchedEpisodes}
          library={library}
          setCurrentEpisode={setCurrentEpisode}
          setSelectedEpisode={setSelectedEpisode}
          setEpisodeFilter={setEpisodeFilter}
          toggleEpisode={toggleEpisode}
          markEpisodesUpTo={markEpisodesUpTo}
          markSeasonComplete={markSeasonComplete}
          clearSeasonEpisodes={clearSeasonEpisodes}
          continueToNextEpisode={continueToNextEpisode}
          onPlayEpisode={(ep) => {
            const serverKey = (() => { try { return (localStorage.getItem("gf_preferred_server") as ServerKey) || "superembed"; } catch { return "superembed"; } })();
            const server = SERVERS.find(s => s.key === serverKey) ?? SERVERS[0];
            const url = server.buildUrl({ type: "tv", tmdbId: item.id, season: selectedSeason, episode: ep.episode_number });
            onOpenWatch({ url, title, mediaType: "tv", tmdbId: item.id, season: selectedSeason, episode: ep.episode_number });
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ── URL ↔ Tab mapping ──────────────────────────────────────────────────────────
const PATH_TO_TAB: Partial<Record<string, Tab>> = {
  "/":          "home",
  "/movies":    "movies",
  "/tv-shows":  "series",
  "/anime":     "anime",
  "/lists":     "lists",
  "/library":   "mylist",
};
const TAB_TO_PATH: Record<string, string> = {
  home:      "/",
  movies:    "/movies",
  series:    "/tv-shows",
  anime:     "/anime",
  lists:     "/lists",
  mylist:    "/library",
  watchlist: "/library",
  watched:   "/library",
  profile:   "/",
};

export default function GoodFilmApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(loadLanguage);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsAnchorTop, setSettingsAnchorTop] = useState(88);
  const [authOpen, setAuthOpen] = useState(false);
  // Shared search overlay open state — controlled from both desktop TopPillNav and MobileTopBar
  const [searchOpen, setSearchOpen] = useState(false);
  // profileOpen/profileOpenView removed — profile is now a tab (activeTab = "profile")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [currentUser, setCurrentUser] = useState<CloudUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const urlTab = PATH_TO_TAB[window.location.pathname];
    if (urlTab) return urlTab;
    try {
      const saved = localStorage.getItem("gf_active_tab");
      const valid = ["home", "movies", "series", "anime", "lists", "profile"];
      return valid.includes(saved || "") ? (saved as Tab) : "home";
    } catch { return "home"; }
  });
  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState<UserLibrary>(() => loadLibrary());
  // Prevents uploading to cloud before we've pulled down the user's existing data
  const cloudSyncReady = useRef(false);
  // Prevents upload on the very first render (before any user action)
  const isFirstRender = useRef(true);

  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [fanFavorites, setFanFavorites] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<MediaItem[]>([]);
  const [crimeTV, setCrimeTV] = useState<MediaItem[]>([]);
  const [dramaTV, setDramaTV] = useState<MediaItem[]>([]);
  const [sciFiFantasyTV, setSciFiFantasyTV] = useState<MediaItem[]>([]);
  const [animationTV, setAnimationTV] = useState<MediaItem[]>([]);
  const [comedyTV, setComedyTV] = useState<MediaItem[]>([]);
    const [latestMovies, setLatestMovies] = useState<MediaItem[]>([]);
  const [latestSeries, setLatestSeries] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<MediaItem[]>([]);
  const [crimeThrillers, setCrimeThrillers] = useState<MediaItem[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<MediaItem[]>([]);
  const [dramaSeries, setDramaSeries] = useState<MediaItem[]>([]);
  const [actionAdventureTV, setActionAdventureTV] = useState<MediaItem[]>([]);
  const [mysteryTV, setMysteryTV] = useState<MediaItem[]>([]);  const [awardWinningTV, setAwardWinningTV] = useState<MediaItem[]>([]);  const [becauseYouWatchedTitle, setBecauseYouWatchedTitle] = useState<string>("");
  const [becauseYouWatchedItems, setBecauseYouWatchedItems] = useState<StreamingRowItem[]>([]);
  // Extra movie genres
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  const [comedyMovies, setComedyMovies] = useState<MediaItem[]>([]);
  const [documentaryMovies, setDocumentaryMovies] = useState<MediaItem[]>([]);
  const [familyMovies, setFamilyMovies] = useState<MediaItem[]>([]);
  const [animationMovies, setAnimationMovies] = useState<MediaItem[]>([]);
  const [thrillerMovies, setThrillerMovies] = useState<MediaItem[]>([]);
  const [historyMovies, setHistoryMovies] = useState<MediaItem[]>([]);
  const [westernMovies, setWesternMovies] = useState<MediaItem[]>([]);
  const [musicMovies, setMusicMovies] = useState<MediaItem[]>([]);
  const [warMovies, setWarMovies] = useState<MediaItem[]>([]);
  // Extra TV genres
  const [realityTV, setRealityTV] = useState<MediaItem[]>([]);
  const [documentaryTV, setDocumentaryTV] = useState<MediaItem[]>([]);
  const [kidsTV, setKidsTV] = useState<MediaItem[]>([]);
  const [warPoliticsTV, setWarPoliticsTV] = useState<MediaItem[]>([]);
  const [familyTV, setFamilyTV] = useState<MediaItem[]>([]);
  const [talkShowTV, setTalkShowTV] = useState<MediaItem[]>([]);
  const [netflixOriginals, setNetflixOriginals] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);

  // ── Movies Explorer tab state ─────────────────────────────────────────────
  const [moviesGenre, setMoviesGenre] = useState<string>("all");
  const [moviesSort, setMoviesSort]   = useState<string>("popular");
  const [moviesSearch, setMoviesSearch] = useState<string>("");
  const [moviesView, setMoviesView]   = useState<"grid" | "list">("grid");
  // Expanded genre pool fetched on-demand (3 pages = 50+ titles)
  const [moviesGenrePool, setMoviesGenrePool] = useState<MediaItem[]>([]);
  const [animeView, setAnimeView]     = useState<"grid" | "list">("grid");
  const [animeSort, setAnimeSort]     = useState<"popular" | "toprated" | "latest" | "movies">("popular");
  const [animeSearch, setAnimeSearch] = useState<string>("");

  // ── TV Tracker tab state ──────────────────────────────────────────────────
  const [tvDiscoveryGenre, setTvDiscoveryGenre] = useState<string>("all");

  // ── Anime tab discovery state ─────────────────────────────────────────────
  const [trendingAnime,       setTrendingAnime]       = useState<MediaItem[]>([]);
  const [topRatedAnime,       setTopRatedAnime]       = useState<MediaItem[]>([]);
  const [airingAnime,         setAiringAnime]         = useState<MediaItem[]>([]);

  const [animeMovies,         setAnimeMovies]         = useState<MediaItem[]>([]);
  const [animeDiscoveryGenre, setAnimeDiscoveryGenre] = useState<string>("all");
  const [animeLoaded, setAnimeLoaded] = useState(false);

  // Refs to preserve "All Anime" baseline data so genre chips can restore it
  const allTrendingAnimeRef  = useRef<MediaItem[]>([]);
  const allTopRatedAnimeRef  = useRef<MediaItem[]>([]);
  const allAiringAnimeRef    = useRef<MediaItem[]>([]);

  // ── Home: Tonight's Pick (one watchlist item surfaced for decision) ───────
  const [tonightPickIdx, setTonightPickIdx] = useState<number>(0);

  const [selectedItem, setSelectedItem] = useState<MediaItem | LibraryItem | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [watchPayload, setWatchPayload] = useState<{ url: string; title: string; mediaType: MediaType; tmdbId?: number; season?: number; episode?: number } | null>(null);

  const [homeError, setHomeError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bulkLinking, setBulkLinking] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setLibrary(loadLibrary());
    setCurrentUser(null);
    setUserProfile(null);
    if (!getLibraryUpdatedAt()) setLibraryUpdatedAt();
  }, []);
  // Persist active tab across refreshes (skip profile — requires login)
  useEffect(() => {
    if (activeTab !== "profile") localStorage.setItem("gf_active_tab", activeTab);
  }, [activeTab]);

  // Navigate when tab changes (URL → activeTab source of truth on direct load)
  const handleSetActiveTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    navigate(TAB_TO_PATH[tab] ?? "/");
  }, [navigate]);

  // Sync browser back/forward → activeTab
  useEffect(() => {
    const tab = PATH_TO_TAB[location.pathname];
    if (tab) setActiveTab(tab);
  }, [location.pathname]);

  // Detect /movie/:id or /tv/:id in URL → open DetailModal in-place
  useEffect(() => {
    const movieMatch = location.pathname.match(/^\/movie\/(\d+)$/);
    const tvMatch    = location.pathname.match(/^\/tv\/(\d+)$/);
    if (movieMatch || tvMatch) {
      const mediaType: MediaType = movieMatch ? "movie" : "tv";
      const id = parseInt((movieMatch ?? tvMatch)![1], 10);
      setSelectedItem(prev => (prev?.id === id ? prev : { id } as MediaItem));
      setSelectedType(mediaType);
    } else {
      setSelectedItem(null);
      setSelectedType(null);
    }
  }, [location.pathname]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id && data.user.email) {
        const user: CloudUser = { id: data.user.id, email: data.user.email, provider: "supabase" };
        setCurrentUser(user);
        setUserProfile(loadUserProfile(user.email));
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id && session.user.email) {
        const user: CloudUser = { id: session.user.id, email: session.user.email, provider: "supabase" };
        setCurrentUser(user);
        // Cloud library download is handled by the currentUser useEffect below,
        // which also sets cloudSyncReady. Avoid duplicate download here.
      } else {
        // Supabase-triggered sign-out (session expiry, signOut() call, etc.)
        setCurrentUser(null);
        setLibrary(defaultLibrary);
        saveLibrary(defaultLibrary);
        cloudSyncReady.current = false;
        isFirstRender.current = true;
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }    setUserProfile(loadUserProfile(currentUser.email));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      cloudSyncReady.current = false;
      return;
    }
    downloadLibraryFromCloud(currentUser)
      .then((cloudRow) => {
        if (cloudRow?.library) {
          // Local is always cleared on logout, so cloud is the source of truth on login
          setLibrary(cloudRow.library);
          saveLibrary(cloudRow.library);
        }
      })
      .catch((err) => {
        if (!isMissingCloudTableError(err)) {
          console.error("Cloud download failed", err);
        }
      })
      .finally(() => {
        cloudSyncReady.current = true;
      });
  }, [currentUser?.id]);

  useEffect(() => {
    // Always save to localStorage
    saveLibrary(library);
    setLibraryUpdatedAt();

    // Skip cloud upload on first render (app just loaded — wait for cloud pull first)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only upload after cloud pull has completed (cloudSyncReady set in download .finally())
    if (currentUser && cloudSyncReady.current) {
      uploadLibraryToCloud(currentUser, library).catch((err) => {
        if (!isMissingCloudTableError(err)) {
          console.error("Cloud upload failed", err);
        }
      });
    }
  }, [library, currentUser?.id]);

  const refreshHomeData = useCallback(() => {
    Promise.all([
      tmdbFetch<{ results: MediaItem[] }>("/trending/movie/week"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/popular"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/top_rated"),
      tmdbFetch<{ results: MediaItem[] }>("/tv/popular"),
      tmdbFetch<{ results: MediaItem[] }>("/tv/top_rated"),      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 80, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10765, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 16, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 35, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { sort_by: "release_date.desc", page: 1, "vote_count.gte": 20 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { sort_by: "first_air_date.desc", page: 1, "vote_count.gte": 10 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 28, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 878, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 80, with_keywords: 10364, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10749, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10759, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 9648, sort_by: "popularity.desc", page: 1 }),      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "vote_average.desc", "vote_count.gte": 300, page: 1 }),
      // Extra movie genres
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 27, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 35, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 99, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10751, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 16, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 53, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 36, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 37, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10402, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { with_genres: 10752, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/movie/top_rated", { page: 1 }),
      // Extra TV genres
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10764, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 99, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10762, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10768, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10751, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10767, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_networks: 213, sort_by: "popularity.desc", page: 1 }),
    ])
      .then(([trending, movies, topMovies, tv, topTv, crime, drama, scifiFantasy, animation, comedy, latestMovieResults, latestTvResults, actionGenre, sciFiGenre, crimeThrillerGenre, romanceGenre, dramaSeriesGenre, actionAdventureGenre, mysteryGenre, awardWinningGenre,
        horrorGenre, comedyMovieGenre, docMovieGenre, familyMovieGenre, animMovieGenre, thrillerMovieGenre, historyMovieGenre, westernMovieGenre, musicMovieGenre, warMovieGenre, topRatedMovieGenre,
        realityTVGenre, docTVGenre, kidsTVGenre, warPoliticsTVGenre, familyTVGenre, talkTVGenre, netflixOriginalsGenre]) => {
        setTrendingMovies(uniqueMediaItems((trending.results || []).slice(0, 24), "movie").slice(0, 18));
        setPopularMovies(uniqueMediaItems((movies.results || []).slice(0, 24), "movie").slice(0, 18));
        setFanFavorites(uniqueMediaItems((topMovies.results || []).slice(0, 24), "movie").slice(0, 18));
        setPopularSeries(uniqueMediaItems((tv.results || []).slice(0, 24), "tv").slice(0, 18));
        setTopRatedTV(uniqueMediaItems((topTv.results || []).slice(0, 24), "tv").slice(0, 18));
        setCrimeTV(uniqueMediaItems((crime.results || []).slice(0, 24), "tv").slice(0, 18));
        setDramaTV(uniqueMediaItems((drama.results || []).slice(0, 24), "tv").slice(0, 18));
        setSciFiFantasyTV(uniqueMediaItems((scifiFantasy.results || []).slice(0, 24), "tv").slice(0, 18));
        setAnimationTV(uniqueMediaItems((animation.results || []).slice(0, 24), "tv").slice(0, 18));
        setComedyTV(uniqueMediaItems((comedy.results || []).slice(0, 24), "tv").slice(0, 18));        setLatestMovies(uniqueMediaItems((latestMovieResults.results || []).slice(0, 24), "movie").slice(0, 18));
        setLatestSeries(uniqueMediaItems((latestTvResults.results || []).slice(0, 24), "tv").slice(0, 18));
        setActionMovies(uniqueMediaItems((actionGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setSciFiMovies(uniqueMediaItems((sciFiGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setCrimeThrillers(uniqueMediaItems((crimeThrillerGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setRomanceMovies(uniqueMediaItems((romanceGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setDramaSeries(uniqueMediaItems((dramaSeriesGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setActionAdventureTV(uniqueMediaItems((actionAdventureGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setMysteryTV(uniqueMediaItems((mysteryGenre.results || []).slice(0, 24), "tv").slice(0, 18));        setAwardWinningTV(uniqueMediaItems((awardWinningGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        // Extra movie genres
        setHorrorMovies(uniqueMediaItems((horrorGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setComedyMovies(uniqueMediaItems((comedyMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setDocumentaryMovies(uniqueMediaItems((docMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setFamilyMovies(uniqueMediaItems((familyMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setAnimationMovies(uniqueMediaItems((animMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setThrillerMovies(uniqueMediaItems((thrillerMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setHistoryMovies(uniqueMediaItems((historyMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setWesternMovies(uniqueMediaItems((westernMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setMusicMovies(uniqueMediaItems((musicMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setWarMovies(uniqueMediaItems((warMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        setTopRatedMovies(uniqueMediaItems((topRatedMovieGenre.results || []).slice(0, 24), "movie").slice(0, 18));
        // Extra TV genres
        setRealityTV(uniqueMediaItems((realityTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setDocumentaryTV(uniqueMediaItems((docTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setKidsTV(uniqueMediaItems((kidsTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setWarPoliticsTV(uniqueMediaItems((warPoliticsTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setFamilyTV(uniqueMediaItems((familyTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setTalkShowTV(uniqueMediaItems((talkTVGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setNetflixOriginals(uniqueMediaItems((netflixOriginalsGenre.results || []).slice(0, 24), "tv").slice(0, 18));
        setFeatured((trending.results || [])[1] || (movies.results || [])[0] || null);
        setHomeError(null);
      })
      .catch(() => setHomeError("TMDB data failed to load. Add your bearer token or API key at the top of the file."));
  }, []);

  useEffect(() => {
    refreshHomeData();

    const handleRefresh = () => refreshHomeData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshHomeData();
    };

    const interval = window.setInterval(refreshHomeData, 300000);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshHomeData]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);

    // Run TMDB multi-search + OMDB search in parallel
    Promise.all([
      tmdbFetch<{ results: MediaItem[] }>("/search/multi", { query: q, include_adult: "false" }),
      omdbFetch({ s: q, type: "movie" }).catch(() => null),
      omdbFetch({ s: q, type: "series" }).catch(() => null),
    ])
      .then(async ([tmdbRes, omdbMovies, omdbSeries]) => {
        const tmdbResults = (tmdbRes.results || []).filter(
          (x) => x.media_type === "movie" || x.media_type === "tv"
        );

        // Merge OMDB results: if OMDB has items not in TMDB top results, fetch them from TMDB by title
        const omdbItems = [
          ...((omdbMovies as any)?.Search || []),
          ...((omdbSeries as any)?.Search || []),
        ] as Array<{ Title: string; Year: string; imdbID: string; Type: string; Poster: string }>;

        // Find OMDB titles not already in TMDB results (by title similarity)
        const tmdbTitles = new Set(tmdbResults.map(r => getTitle(r).toLowerCase()));
        const extraTitles = omdbItems
          .filter(o => !tmdbTitles.has(o.Title.toLowerCase()))
          .slice(0, 5);

        let extras: MediaItem[] = [];
        if (extraTitles.length > 0) {
          const extraFetches = await Promise.allSettled(
            extraTitles.map(o =>
              tmdbFetch<{ results: MediaItem[] }>("/search/multi", {
                query: o.Title,
                year: o.Year?.slice(0, 4),
                include_adult: "false",
              }).then(r =>
                (r.results || [])
                  .filter(x => x.media_type === "movie" || x.media_type === "tv")
                  .slice(0, 1)
              ).catch(() => [])
            )
          );
          extras = extraFetches
            .filter((r): r is PromiseFulfilledResult<MediaItem[]> => r.status === "fulfilled")
            .flatMap(r => r.value);
        }

        // Merge and dedupe by id
        const seen = new Set<number>();
        const merged = [...tmdbResults, ...extras].filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        setSearchResults(merged);
        setSearchError(null);
      })
      .catch(() => setSearchError("Search request failed."))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch]);

  const watchlistKeys = useMemo(() => new Set(library.watchlist.map(keyFor)), [library.watchlist]);
  const watchedKeys = useMemo(() => new Set(library.watched.map(keyFor)), [library.watched]);
  const watchingKeys = useMemo(() => new Set((library.watchingItems || []).map(keyFor)), [library.watchingItems]);
  const waitingKeys  = useMemo(() => new Set((library.waitingItems  || []).map(keyFor)), [library.waitingItems]);

  const toRowItems = useCallback((items: Array<MediaItem | LibraryItem>, fallbackType?: MediaType, extras?: Partial<StreamingRowItem>) => {
    return items.map((entry) => {
      const mediaType = "mediaType" in entry ? entry.mediaType : entry.media_type || (entry.first_air_date ? "tv" : fallbackType || "movie");
      return {
        id: entry.id,
        mediaType,
        title: "mediaType" in entry ? entry.title : getTitle(entry),
        image: "mediaType" in entry ? (entry.backdropPath || entry.posterPath) : (entry.backdrop_path || entry.poster_path || null),
        sourceItem: entry,
        ...extras,
      } as StreamingRowItem;
    });
  }, []);

  const continueWatchingItems = useMemo(() => {
    return Object.entries(library.watching)
      .map(([showId, progress]) => {
        const numericId = Number(showId);
        const source =
          (library.watchingItems || []).find((item) => item.id === numericId) ||
          (library.waitingItems  || []).find((item) => item.id === numericId) ||
          library.watchlist.find((item) => item.id === numericId && item.mediaType === "tv") ||
          library.watched.find((item) => item.id === numericId && item.mediaType === "tv") ||
          trendingAnime.find((item) => item.id === numericId) ||
          airingAnime.find((item) => item.id === numericId) ||
          popularSeries.find((item) => item.id === numericId) ||
          latestSeries.find((item) => item.id === numericId) ||
          crimeTV.find((item) => item.id === numericId) ||
          dramaTV.find((item) => item.id === numericId) ||
          sciFiFantasyTV.find((item) => item.id === numericId) ||
          animationTV.find((item) => item.id === numericId) ||
          comedyTV.find((item) => item.id === numericId);
        if (!source) return null;

        const season = progress.season || 1;
        const watchedEpisodes = progress.watchedEpisodesBySeason?.[String(season)] || [];
        const currentEpisode = progress.selectedEpisodeBySeason?.[String(season)] || watchedEpisodes[watchedEpisodes.length - 1] || 1;
        const progressPercent = Math.min(100, Math.max(8, watchedEpisodes.length * 12.5));

        return {
          id: source.id,
          mediaType: "tv" as MediaType,
          title: "mediaType" in source ? source.title : getTitle(source),
          image: "mediaType" in source ? (source.backdropPath || source.posterPath) : (source.backdrop_path || source.poster_path || null),
          subtitle: `Season ${season} · Episode ${currentEpisode}`,
          progress: progressPercent,
          meta: `${watchedEpisodes.length} watched episodes`,
          sourceItem: source as MediaItem | LibraryItem,
        } as StreamingRowItem;
      })
      .filter(Boolean) as StreamingRowItem[];
  }, [library.watching, library.watchlist, library.watched, library.watchingItems, library.waitingItems, trendingAnime, airingAnime, popularSeries, latestSeries, crimeTV, dramaTV, sciFiFantasyTV, animationTV, comedyTV]);

  const homeRows = useMemo(() => uniqueRowDefinitions([
    { title: tr(appLanguage, "trendingNow"), items: trendingMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "latestMovies"), items: latestMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "popularTVSeries"), items: popularSeries, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "fanFavorites"), items: fanFavorites, mediaType: "movie" as MediaType },
    { title: "Action Movies", items: actionMovies, mediaType: "movie" as MediaType },
    { title: "Netflix Originals", items: netflixOriginals, mediaType: "tv" as MediaType },
    { title: "Horror Movies", items: horrorMovies, mediaType: "movie" as MediaType },
    { title: "Drama Series", items: dramaSeries, mediaType: "tv" as MediaType },
    { title: "Comedy Movies", items: comedyMovies, mediaType: "movie" as MediaType },
    { title: "Top Rated Movies", items: topRatedMovies, mediaType: "movie" as MediaType },
    { title: "Sci-Fi & Fantasy TV", items: sciFiFantasyTV, mediaType: "tv" as MediaType },
    { title: "Thriller Movies", items: thrillerMovies, mediaType: "movie" as MediaType },
    { title: "Animation Movies", items: animationMovies, mediaType: "movie" as MediaType },
    { title: "Award-Winning Drama", items: awardWinningTV, mediaType: "tv" as MediaType },
    { title: "Family Movies", items: familyMovies, mediaType: "movie" as MediaType },
    { title: "Documentary", items: documentaryMovies, mediaType: "movie" as MediaType },
    { title: "Mystery TV", items: mysteryTV, mediaType: "tv" as MediaType },
    { title: "Reality TV", items: realityTV, mediaType: "tv" as MediaType },
    { title: "War Movies", items: warMovies, mediaType: "movie" as MediaType },
    { title: "Romance Movies", items: romanceMovies, mediaType: "movie" as MediaType },
    { title: "Kids & Family TV", items: kidsTV, mediaType: "tv" as MediaType },
    { title: "Crime Thrillers", items: crimeThrillers, mediaType: "movie" as MediaType },
    { title: "Talk Shows", items: talkShowTV, mediaType: "tv" as MediaType },
  ]), [appLanguage, trendingMovies, latestMovies, popularSeries, fanFavorites, actionMovies, dramaSeries, awardWinningTV, horrorMovies, comedyMovies, topRatedMovies, sciFiFantasyTV, thrillerMovies, animationMovies, familyMovies, documentaryMovies, netflixOriginals, mysteryTV, realityTV, warMovies, romanceMovies, kidsTV, crimeThrillers, talkShowTV]);

  const movieRows = useMemo(() => uniqueRowDefinitions([
    { title: tr(appLanguage, "latestMovies"), items: latestMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "popularMovies"), items: popularMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "trendingMovies"), items: trendingMovies, mediaType: "movie" as MediaType },
    { title: "Top Rated Movies", items: topRatedMovies, mediaType: "movie" as MediaType },
    { title: tr(appLanguage, "fanFavorites"), items: fanFavorites, mediaType: "movie" as MediaType },
    { title: "Action Movies", items: actionMovies, mediaType: "movie" as MediaType },
    { title: "Sci-Fi Movies", items: sciFiMovies, mediaType: "movie" as MediaType },
    { title: "Horror Movies", items: horrorMovies, mediaType: "movie" as MediaType },
    { title: "Comedy Movies", items: comedyMovies, mediaType: "movie" as MediaType },
    { title: "Thriller Movies", items: thrillerMovies, mediaType: "movie" as MediaType },
    { title: "Crime Thrillers", items: crimeThrillers, mediaType: "movie" as MediaType },
    { title: "Romance Movies", items: romanceMovies, mediaType: "movie" as MediaType },
    { title: "Animation Movies", items: animationMovies, mediaType: "movie" as MediaType },
    { title: "Family Movies", items: familyMovies, mediaType: "movie" as MediaType },
    { title: "Documentary Movies", items: documentaryMovies, mediaType: "movie" as MediaType },
    { title: "History Movies", items: historyMovies, mediaType: "movie" as MediaType },
    { title: "War Movies", items: warMovies, mediaType: "movie" as MediaType },
    { title: "Western Movies", items: westernMovies, mediaType: "movie" as MediaType },
    { title: "Music Movies", items: musicMovies, mediaType: "movie" as MediaType },
  ]), [appLanguage, latestMovies, popularMovies, trendingMovies, fanFavorites, actionMovies, sciFiMovies, crimeThrillers, romanceMovies, topRatedMovies, horrorMovies, comedyMovies, thrillerMovies, animationMovies, familyMovies, documentaryMovies, historyMovies, warMovies, westernMovies, musicMovies]);

  const seriesRows = useMemo(() => uniqueRowDefinitions([
    { title: tr(appLanguage, "latestSeries"), items: latestSeries, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "popularTVSeries"), items: popularSeries, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "topRatedTV"), items: topRatedTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "crimeTV"), items: crimeTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "dramaTV"), items: dramaTV, mediaType: "tv" as MediaType },
    { title: "Drama Series", items: dramaSeries, mediaType: "tv" as MediaType },
    { title: "Action & Adventure TV", items: actionAdventureTV, mediaType: "tv" as MediaType },
    { title: "Mystery TV", items: mysteryTV, mediaType: "tv" as MediaType },
    { title: "Award-Winning Drama", items: awardWinningTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "sciFiFantasyTV"), items: sciFiFantasyTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "animationTV"), items: animationTV, mediaType: "tv" as MediaType },
    { title: tr(appLanguage, "comedyTV"), items: comedyTV, mediaType: "tv" as MediaType },
    { title: "Reality TV", items: realityTV, mediaType: "tv" as MediaType },
    { title: "Documentary Series", items: documentaryTV, mediaType: "tv" as MediaType },
    { title: "Kids & Family TV", items: kidsTV, mediaType: "tv" as MediaType },
    { title: "War & Politics", items: warPoliticsTV, mediaType: "tv" as MediaType },
    { title: "Family TV", items: familyTV, mediaType: "tv" as MediaType },
    { title: "Talk Shows", items: talkShowTV, mediaType: "tv" as MediaType },
    { title: "Netflix Originals", items: netflixOriginals, mediaType: "tv" as MediaType },
  ]), [appLanguage, latestSeries, popularSeries, topRatedTV, crimeTV, dramaTV, dramaSeries, actionAdventureTV, mysteryTV, awardWinningTV, sciFiFantasyTV, animationTV, comedyTV, realityTV, documentaryTV, kidsTV, warPoliticsTV, familyTV, talkShowTV, netflixOriginals]);

  const streamingRows = useMemo(() => ([
    { title: "Trending Now", items: toRowItems([...trendingMovies.slice(0, 8), ...popularSeries.slice(0, 8)], undefined, { badge: "Discovery" }) },
    { title: "Trending Movies", items: toRowItems(trendingMovies, "movie", { badge: "Discovery" }) },
    { title: "Trending Series", items: toRowItems(popularSeries, "tv", { badge: "Discovery" }) },
    { title: "Popular on GoodFilm", items: toRowItems([...popularMovies.slice(0, 10), ...popularSeries.slice(0, 8)], undefined, { badge: "Discovery" }) },
    { title: "Top Rated Movies", items: toRowItems(fanFavorites, "movie", { badge: "Discovery" }) },
    { title: "Top Rated Series", items: toRowItems(topRatedTV, "tv", { badge: "Discovery" }) },
    { title: "Action Movies", items: toRowItems(actionMovies, "movie", { badge: "Genre" }) },
    { title: "Sci-Fi Movies", items: toRowItems(sciFiMovies, "movie", { badge: "Genre" }) },
    { title: "Crime Thrillers", items: toRowItems(crimeThrillers, "movie", { badge: "Genre" }) },
    { title: "Romance Movies", items: toRowItems(romanceMovies, "movie", { badge: "Genre" }) },
    { title: "Drama Series", items: toRowItems(dramaSeries, "tv", { badge: "Genre" }) },
  ]), [toRowItems, trendingMovies, popularSeries, popularMovies, fanFavorites, topRatedTV, actionMovies, sciFiMovies, crimeThrillers, romanceMovies, dramaSeries]);

  const dailyRecommendationSeed = useMemo(() => {
    const watchedMovies = library.watched.filter((item) => {
      if (item.mediaType !== "movie") return false;
      const rating = library.ratings[keyFor(item)];
      return typeof rating === "number" && rating >= 7 && rating <= 10;
    });
    if (!watchedMovies.length) return null;

    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const start = Date.UTC(utcYear, 0, 0);
    const today = Date.UTC(utcYear, now.getUTCMonth(), now.getUTCDate());
    const dayOfYear = Math.floor((today - start) / 86400000);
    const index = (dayOfYear - 1) % watchedMovies.length;
    return watchedMovies[index] || watchedMovies[0] || null;
  }, [library.watched, library.ratings]);

  useEffect(() => {
    let cancelled = false;

    const loadBecauseYouWatched = async () => {
      const seed = dailyRecommendationSeed;
      if (!seed) {
        setBecauseYouWatchedTitle("");
        setBecauseYouWatchedItems([]);
        return;
      }

      try {
        let tmdbId = seed.id;
        let tmdbType: MediaType = seed.mediaType;
        let displayTitle = seed.title;

        const matched = await searchTMDBMatchForLibraryItem(seed);
        if (matched) {
          tmdbId = matched.id;
          tmdbType = seed.mediaType;
          displayTitle = getTitle(matched);
        }

        const recs = await tmdbFetch<{ results: MediaItem[] }>(`/${tmdbType}/${tmdbId}/recommendations`);
        if (cancelled) return;

        const owned = new Set([
          ...library.watchlist.map((item) => keyFor(item)),
          ...library.watched.map((item) => keyFor(item)),
        ]);

        const filtered = uniqueMediaItems(recs.results || [], tmdbType)
          .filter((entry) => entry.id !== tmdbId)
          .filter((entry) => {
            const type: MediaType = entry.media_type || (entry.first_air_date ? "tv" : "movie");
            return !owned.has(keyFor({ id: entry.id, mediaType: type }));
          })
          .slice(0, 12);

        setBecauseYouWatchedTitle(displayTitle);
        setBecauseYouWatchedItems(toRowItems(filtered, tmdbType, { badge: "Because You Watched" }));
      } catch {
        if (!cancelled) {
          setBecauseYouWatchedTitle(seed.title);
          setBecauseYouWatchedItems([]);
        }
      }
    };

    loadBecauseYouWatched();
    return () => {
      cancelled = true;
    };
  }, [dailyRecommendationSeed, library.watchlist, library.watched, toRowItems]);

  const ensureItem = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType): LibraryItem => {
    if ("mediaType" in item) return item;
    return normalizeMedia(item, mediaType);
  }, []);

  const toggleWatchlist = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const inWatchlist = prev.watchlist.some((x) => keyFor(x) === k);
      if (inWatchlist) {
        return { ...prev, watchlist: prev.watchlist.filter((x) => keyFor(x) !== k) };
      }
      return {
        ...prev,
        watchlist: [normalized, ...prev.watchlist],
        watched: prev.watched.filter((x) => keyFor(x) !== k),
        watchingItems: (prev.watchingItems || []).filter((x) => keyFor(x) !== k),
        waitingItems:  (prev.waitingItems  || []).filter((x) => keyFor(x) !== k),
      };
    });
  }, [ensureItem]);

  const toggleWatched = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const inWatched = prev.watched.some((x) => keyFor(x) === k);
      if (inWatched) {
        return { ...prev, watched: prev.watched.filter((x) => keyFor(x) !== k) };
      }
      return {
        ...prev,
        watched: [normalized, ...prev.watched],
        watchlist: prev.watchlist.filter((x) => keyFor(x) !== k),
        watchingItems: (prev.watchingItems || []).filter((x) => keyFor(x) !== k),
        waitingItems:  (prev.waitingItems  || []).filter((x) => keyFor(x) !== k),
      };
    });
  }, [ensureItem]);

  const addToWatching = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const inWatching = (prev.watchingItems || []).some((x) => keyFor(x) === k);
      if (inWatching) {
        return { ...prev, watchingItems: (prev.watchingItems || []).filter((x) => keyFor(x) !== k) };
      }
      // Ensure a skeleton watching-progress entry exists so Continue Watching shows immediately
      const watchingEntry = prev.watching[String(normalized.id)] || {
        season: 1, episodeFilter: "all" as const,
        selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {},
      };
      return {
        ...prev,
        watchingItems: [normalized, ...(prev.watchingItems || [])],
        watchlist: prev.watchlist.filter((x) => keyFor(x) !== k),
        watched:   prev.watched.filter((x) => keyFor(x) !== k),
        waitingItems: (prev.waitingItems || []).filter((x) => keyFor(x) !== k),
        watching: { ...prev.watching, [String(normalized.id)]: watchingEntry },
      };
    });
  }, [ensureItem]);

  const addToWaiting = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const inWaiting = (prev.waitingItems || []).some((x) => keyFor(x) === k);
      if (inWaiting) {
        return { ...prev, waitingItems: (prev.waitingItems || []).filter((x) => keyFor(x) !== k) };
      }
      return {
        ...prev,
        waitingItems:  [normalized, ...(prev.waitingItems  || [])],
        watchlist:     prev.watchlist.filter((x) => keyFor(x) !== k),
        watched:       prev.watched.filter((x) => keyFor(x) !== k),
        watchingItems: (prev.watchingItems || []).filter((x) => keyFor(x) !== k),
      };
    });
  }, [ensureItem]);

  const removeFromLibrary = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => ({
      ...prev,
      watchlist:    prev.watchlist.filter((x) => keyFor(x) !== k),
      watched:      prev.watched.filter((x) => keyFor(x) !== k),
      watchingItems: (prev.watchingItems || []).filter((x) => keyFor(x) !== k),
      waitingItems:  (prev.waitingItems  || []).filter((x) => keyFor(x) !== k),
      ratings: Object.fromEntries(Object.entries(prev.ratings).filter(([key]) => key !== k)),
      notes:   Object.fromEntries(Object.entries(prev.notes).filter(([key]) => key !== k)),
    }));
  }, [ensureItem]);

  // ── Custom list handlers ──────────────────────────────────────────────────

  const createCustomList = useCallback((name: string) => {
    const newList: CustomList = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      items: [],
    };
    setLibrary((prev) => {
      const updated = { ...prev, customLists: [...(prev.customLists ?? []), newList] };
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const deleteCustomList = useCallback((id: string) => {
    setLibrary((prev) => {
      const updated = { ...prev, customLists: (prev.customLists ?? []).filter((l) => l.id !== id) };
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const [topPersonModalId, setTopPersonModalId] = useState<number | null>(null);

  const toggleFollowPerson = useCallback((person: { id: number; name: string; profilePath: string | null; knownFor: string }) => {
    setLibrary((prev) => {
      const current = prev.followedPeople ?? [];
      const exists = current.some((p) => p.id === person.id);
      const updated = {
        ...prev,
        followedPeople: exists
          ? current.filter((p) => p.id !== person.id)
          : [...current, person],
      };
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const renameCustomList = useCallback((id: string, name: string) => {
    setLibrary((prev) => {
      const updated = { ...prev, customLists: (prev.customLists ?? []).map((l) => l.id === id ? { ...l, name } : l) };
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const addToCustomList = useCallback((listId: string, item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const entry: CustomListItem = {
      id: item.id,
      mediaType,
      title: getTitle(item as MediaItem),
      posterPath: (item as MediaItem).poster_path ?? (item as LibraryItem).posterPath ?? null,
    };
    setLibrary((prev) => {
      const updated = {
        ...prev,
        customLists: (prev.customLists ?? []).map((l) =>
          l.id === listId && !l.items.some((i) => i.id === item.id && i.mediaType === mediaType)
            ? { ...l, items: [...l.items, entry] }
            : l
        ),
      };
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const removeFromCustomList = useCallback((listId: string, itemId: number, mediaType: MediaType) => {
    setLibrary((prev) => {
      const updated = {
        ...prev,
        customLists: (prev.customLists ?? []).map((l) =>
          l.id === listId
            ? { ...l, items: l.items.filter((i) => !(i.id === itemId && i.mediaType === mediaType)) }
            : l
        ),
      };
      saveLibrary(updated);
      return updated;
    });
  }, []);

  // ── Anime discovery fetch (TMDB) ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setAnimeLoaded(false);
    const tmdbAnime = async (sort: string, extra: Record<string, string> = {}, type: "tv" | "movie" = "tv") => {
      const pages = await Promise.allSettled([1, 2, 3].map(page =>
        tmdbFetch<{ results: MediaItem[] }>(`/discover/${type}`, {
          with_genres: "16", with_original_language: "ja", sort_by: sort, page: String(page), ...extra,
        })
      ));
      const all = pages.flatMap(p => p.status === "fulfilled" ? (p.value.results || []) : []);
      return uniqueMediaItems(all, type);
    };

    Promise.allSettled([
      tmdbAnime("popularity.desc").then(d => {
        if (!cancelled) { setTrendingAnime(d); allTrendingAnimeRef.current = d; }
      }),
      tmdbAnime("vote_average.desc", { "vote_count.gte": "100" }).then(d => {
        if (!cancelled) { setTopRatedAnime(d); allTopRatedAnimeRef.current = d; }
      }),
      tmdbAnime("first_air_date.desc").then(d => {
        if (!cancelled) { setAiringAnime(d); allAiringAnimeRef.current = d; }
      }),
      tmdbAnime("popularity.desc", {}, "movie").then(d => { if (!cancelled) setAnimeMovies(d); }),
    ]).then(() => { if (!cancelled) setAnimeLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Restore baseline data when returning to "All Anime"
    if (animeDiscoveryGenre === "all") {
      if (allTrendingAnimeRef.current.length)  setTrendingAnime(allTrendingAnimeRef.current);
      if (allTopRatedAnimeRef.current.length)  setTopRatedAnime(allTopRatedAnimeRef.current);
      if (allAiringAnimeRef.current.length)    setAiringAnime(allAiringAnimeRef.current);
      return;
    }
    let cancelled = false;
    // TMDB TV genre IDs — used alone (not ANDed with 16) so we get a broad pool
    // of Japanese-language content in the sub-genre (overwhelmingly anime in practice)
    const tmdbGenreId: Record<string, string> = {
      action:      "10759",
      fantasy:     "10765",
      romance:     "10749",
      comedy:      "35",
      drama:       "18",
      scifi:       "10765",
      mecha:       "10765",
      sliceoflife: "10751",
      supernatural:"10765",
    };
    const gid = tmdbGenreId[animeDiscoveryGenre] || "16";

    const fetchPages = (sortBy: string, extra: Record<string, string> = {}) =>
      Promise.allSettled([1, 2, 3].map(page =>
        tmdbFetch<{ results: MediaItem[] }>("/discover/tv", {
          with_genres: gid, with_original_language: "ja", sort_by: sortBy, page: String(page), ...extra,
        })
      )).then(settled => {
        const all = settled.flatMap(p => p.status === "fulfilled" ? (p.value.results || []) : []);
        return uniqueMediaItems(all, "tv");
      });

    fetchPages("popularity.desc").then(d => { if (!cancelled) setTrendingAnime(d); }).catch(() => {});
    fetchPages("vote_average.desc", { "vote_count.gte": "30" }).then(d => { if (!cancelled) setTopRatedAnime(d); }).catch(() => {});
    fetchPages("first_air_date.desc").then(d => { if (!cancelled) setAiringAnime(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [animeDiscoveryGenre]);

  // ── Movies genre chip: fetch 3 pages on-demand (50+ titles) ─────────────
  useEffect(() => {
    if (moviesGenre === "all") { setMoviesGenrePool([]); return; }
    let cancelled = false;
    const tmdbMovieGenreId: Record<string, string> = {
      action:      "28",
      scifi:       "878",
      horror:      "27",
      comedy:      "35",
      thriller:    "53",
      crime:       "80",
      romance:     "10749",
      animation:   "16",
      drama:       "18",
      documentary: "99",
      family:      "10751",
      history:     "36",
      western:     "37",
    };
    const gid = tmdbMovieGenreId[moviesGenre];
    if (!gid) return;

    Promise.allSettled([1, 2, 3].map(page =>
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", {
        with_genres: gid, sort_by: "popularity.desc", page: String(page),
      })
    )).then(settled => {
      if (cancelled) return;
      const all = settled.flatMap(p => p.status === "fulfilled" ? (p.value.results || []) : []);
      setMoviesGenrePool(uniqueMediaItems(all, "movie"));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [moviesGenre]);

  const openDetail = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    navigate(`/${mediaType}/${item.id}`);
  }, [navigate]);

  const closeDetail = useCallback(() => {
    // Navigate to the current tab's canonical URL; the URL-sync effect clears the modal state
    navigate(TAB_TO_PATH[activeTab] ?? "/");
  }, [navigate, activeTab]);

const openWatch = useCallback((payload: {
  url: string;
  title: string;
  mediaType: MediaType;
  tmdbId?: number;
  season?: number;
  episode?: number;
}) => {
  setWatchPayload(payload);
}, []);

  const closeWatch = useCallback(() => {
    setWatchPayload(null);
  }, []);

  const setRating = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType, rating: number) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const inLibrary = prev.watchlist.some((x) => keyFor(x) === k) ||
        prev.watched.some((x) => keyFor(x) === k) ||
        (prev.watchingItems || []).some((x) => keyFor(x) === k) ||
        (prev.waitingItems  || []).some((x) => keyFor(x) === k);
      return {
        ...prev,
        watchlist: inLibrary ? prev.watchlist : [normalized, ...prev.watchlist],
        ratings: { ...prev.ratings, [k]: rating },
      };
    });
  }, [ensureItem]);

  const setWatchingSeason = useCallback((showId: number, season: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)];
      const watchedEpisodesBySeason = current?.watchedEpisodesBySeason || {};
      const selectedEpisodeBySeason = current?.selectedEpisodeBySeason || {};
      const firstTrackedEpisode = watchedEpisodesBySeason[String(season)]?.[0] || 1;

      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            season,
            episodeFilter: current?.episodeFilter || "all",
            watchedEpisodesBySeason,
            selectedEpisodeBySeason: {
              ...selectedEpisodeBySeason,
              [String(season)]: selectedEpisodeBySeason[String(season)] || firstTrackedEpisode,
            },
          },
        },
      };
    });
  }, []);

  const setEpisodeFilter = useCallback((showId: number, filter: "all" | "watched" | "unwatched") => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            episodeFilter: filter,
          },
        },
      };
    });
  }, []);

  const setCurrentEpisode = useCallback((showId: number, episode: number, season?: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: season || 1, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season ?? current.season ?? 1);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season: season ?? current.season ?? 1,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: episode,
            },
          },
        },
      };
    });
  }, []);

  const continueToNextEpisode = useCallback((showId: number, season: number, episodeNumbers: number[]) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const watched = new Set(current.watchedEpisodesBySeason[seasonKey] || []);
      const nextEpisode = episodeNumbers.find((ep) => !watched.has(ep)) || episodeNumbers[episodeNumbers.length - 1] || 1;
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: nextEpisode,
            },
          },
        },
      };
    });
  }, []);


  const toggleEpisode = useCallback((showId: number, episode: number, season?: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: season || 1, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season ?? current.season ?? 1);
      const currentSeasonEpisodes = current.watchedEpisodesBySeason[seasonKey] || [];
      const exists = currentSeasonEpisodes.includes(episode);
      const nextSeasonEpisodes = exists
        ? currentSeasonEpisodes.filter((x) => x !== episode)
        : [...currentSeasonEpisodes, episode].sort((a, b) => a - b);

      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: nextSeasonEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const markEpisodesUpTo = useCallback((showId: number, season: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const nextSeasonEpisodes = Array.from({ length: Math.max(episode - 1, 0) }, (_, i) => i + 1);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: episode,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: nextSeasonEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const markSeasonComplete = useCallback((showId: number, season: number, episodeNumbers: number[]) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const normalizedEpisodes = normalizeEpisodeNumbers(episodeNumbers);
      const lastEpisode = normalizedEpisodes[normalizedEpisodes.length - 1] || 1;
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: lastEpisode,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: normalizedEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const clearSeasonEpisodes = useCallback((showId: number, season: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: 1,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: [],
            },
          },
        },
      };
    });
  }, []);

  const resolveLibraryItemToTMDB = useCallback((oldItem: LibraryItem, resolved: MediaItem, mediaType: MediaType) => {
    const normalized = normalizeMedia(resolved, mediaType);
    const oldKey = keyFor(oldItem);
    const newKey = keyFor(normalized);

    setLibrary((prev) => {
      const replaceItem = (items: LibraryItem[]) =>
        dedupeLibraryItems(
          items.map((entry) => (keyFor(entry) === oldKey ? { ...normalized } : entry))
        );

      const nextRatings = { ...prev.ratings };
      if (oldKey !== newKey && typeof nextRatings[oldKey] === "number") {
        nextRatings[newKey] = nextRatings[oldKey];
        delete nextRatings[oldKey];
      }

      const nextWatching = { ...prev.watching };
      if (mediaType === "tv") {
        const oldWatching = nextWatching[String(oldItem.id)];
        if (oldWatching) {
          nextWatching[String(normalized.id)] = oldWatching;
          if (String(normalized.id) !== String(oldItem.id)) delete nextWatching[String(oldItem.id)];
        }
      }

      return {
        ...prev,
        watchlist: replaceItem(prev.watchlist),
        watched: replaceItem(prev.watched),
        ratings: nextRatings,
        watching: nextWatching,
      };
    });

    setSelectedItem((prev) => {
      if (!prev || !("mediaType" in prev)) return prev;
      return keyFor(prev) === oldKey ? normalized : prev;
    });
  }, []);

  const bulkLinkLibraryToTMDB = useCallback(async () => {
    if (bulkLinking) return;
    const uniqueItems = dedupeLibraryItems([...library.watchlist, ...(library.watchingItems || []), ...library.watched]);
    if (!uniqueItems.length) {
      window.alert("No library items to link.");
      return;
    }

    setBulkLinking(true);
    try {
      const matches = await mapWithConcurrency(uniqueItems, 4, async (item) => {
        try {
          const match = await searchTMDBMatchForLibraryItem(item);
          return { oldItem: item, match };
        } catch {
          return { oldItem: item, match: null };
        }
      });

      const mapping = new Map<string, LibraryItem>();
      let linkedCount = 0;
      matches.forEach(({ oldItem, match }) => {
        if (!match) return;
        const normalized = normalizeMedia(match, oldItem.mediaType);
        mapping.set(keyFor(oldItem), normalized);
        if (normalized.id !== oldItem.id || normalized.title !== oldItem.title) linkedCount += 1;
      });

      setLibrary((prev) => {
        const replaceItems = (items: LibraryItem[]) =>
          dedupeLibraryItems(items.map((entry) => mapping.get(keyFor(entry)) || entry));

        const nextWatchlist = replaceItems(prev.watchlist);
        const nextWatched = replaceItems(prev.watched);
        const nextRatings: Record<string, number> = {};
        Object.entries(prev.ratings).forEach(([oldKey, value]) => {
          const original = [...prev.watchlist, ...prev.watched].find((entry) => keyFor(entry) === oldKey);
          if (!original) return;
          const replaced = mapping.get(oldKey) || original;
          nextRatings[keyFor(replaced)] = value;
        });

        const nextWatching: WatchingProgress = {};
        Object.entries(prev.watching).forEach(([showId, progress]) => {
          const original = [...prev.watchlist, ...prev.watched].find((entry) => entry.mediaType === "tv" && String(entry.id) === String(showId));
          if (!original) {
            nextWatching[showId] = progress;
            return;
          }
          const replaced = mapping.get(keyFor(original)) || original;
          nextWatching[String(replaced.id)] = progress;
        });

        const nextWatchingItems = replaceItems(prev.watchingItems || []);
        return {
          ...prev,
          watchlist: nextWatchlist,
          watchingItems: nextWatchingItems,
          watched: nextWatched,
          ratings: nextRatings,
          watching: nextWatching,
        };
      });

      window.alert(`Bulk link finished. ${linkedCount} items matched to TMDB.`);
    } finally {
      setBulkLinking(false);
    }
  }, [library, bulkLinking]);

  const exportLibrary = useCallback(() => {
    const payload: ImportExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      library: sanitizeLibrary(library),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = `goodfilm_library_${new Date().toISOString().slice(0, 10)}.json`;

    // Try modern File System API first (most reliable)
    if (typeof (window as any).showSaveFilePicker === "function") {
      (async () => {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: "JSON file", accept: { "application/json": [".json"] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch {
          // user cancelled or API unavailable — fall through
        }
      })();
      return;
    }

    // Fallback: anchor click method
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      // Last resort: open JSON in new tab so user can save manually
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }, [library]);

  const importLibrary = useCallback(async (file: File) => {
    try {
      const rawText = (await file.text()).trim();
      if (!rawText) {
        window.alert("The selected file is empty.");
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = JSON.parse(rawText.replace(/^﻿/, ""));
      }

      const candidates = [
        parsed?.library,
        parsed?.data?.library,
        parsed?.data,
        parsed?.goodfilm,
        parsed,
      ].filter(Boolean);

      let sanitized: UserLibrary | null = null;
      for (const candidate of candidates) {
        const next = sanitizeLibrary(candidate);
        const totalItems = next.watchlist.length + next.watched.length + Object.keys(next.watching).length + Object.keys(next.ratings).length;
        if (totalItems > 0) {
          sanitized = next;
          break;
        }
      }

      if (!sanitized) {
        window.alert("Import failed: no valid GoodFilm data was found in that file.");
        return;
      }

      const merged = mergeLibraries(library, sanitized as UserLibrary);
      setLibrary(() => merged);
      saveLibrary(merged);

      if (currentUser) {
        try {
          await uploadLibraryToCloud(currentUser, merged);
        } catch {
          window.alert("Imported locally, but cloud sync failed. Check your Supabase connection and policies.");
        }
      }

      window.alert(`Library merged successfully. ${merged.watchlist.length} watchlist, ${merged.watched.length} watched, ${Object.keys(merged.watching).length} series in progress.`);
    } catch {
      window.alert("Invalid JSON file. Export a library from GoodFilm first, or use a compatible JSON structure.");
    }
  }, [currentUser]);

    const selectedKey = selectedItem && selectedType ? keyFor({ id: selectedItem.id, mediaType: selectedType }) : null;

  // Shared profile open handler (used by both desktop nav and mobile top bar)
  const handleOpenProfile = (view?: "profile" | "settings", anchorTop?: number) => {
    if (anchorTop !== undefined) setSettingsAnchorTop(anchorTop);
    if (currentUser) {
      if (view === "settings") setSettingsOpen(true);
      else handleSetActiveTab("profile");
    } else {
      setAuthMode("login");
      setAuthOpen(true);
    }
  };

  const handleLogout = () => {
    if (currentUser?.provider === "supabase" && supabase) supabase.auth.signOut();
    setCurrentUser(null);
    setUserProfile(null);
    setLibrary(defaultLibrary);
    saveLibrary(defaultLibrary);
    cloudSyncReady.current = false;
    isFirstRender.current = true;
    handleSetActiveTab("home");
  };

  return (
    <AppShell>
      {/* ── Mobile Top Bar (phone only, replaces desktop header) ── */}
      <MobileTopBar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onSearchOpen={() => setSearchOpen(true)}
        onProfileOpen={() => handleOpenProfile()}
        onSettingsOpen={() => setSettingsOpen(true)}
        currentUser={currentUser}
        userProfile={userProfile}
      />

      <TopPillNav
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        search={search}
        setSearch={setSearch}
        onOpenProfile={handleOpenProfile}
        appLanguage={appLanguage}
        searchResults={searchResults}
        searchLoading={searchLoading}
        searchError={searchError}
        onOpenResult={openDetail}
        currentUser={currentUser}
        userProfile={userProfile}
        library={library}
        onLogout={handleLogout}
        searchOpenOverride={searchOpen}
        onSearchOpenChange={setSearchOpen}
      />
      <AuthModal open={authOpen} mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSuccess={async (user, mode, profile) => {
          cloudSyncReady.current = false;
          isFirstRender.current = false;
          setCurrentUser(user);
          if (profile) setUserProfile(profile);
          if (user.provider === "supabase") {
            try {
              const cloudRow = await downloadLibraryFromCloud(user);
              if (cloudRow?.library) {
                setLibrary(cloudRow.library);
                saveLibrary(cloudRow.library);
              }
            } catch {
              window.alert("Cloud sync failed. Check your Supabase connection and policies.");
            } finally {
              cloudSyncReady.current = true;
            }
          }
        }} />
      <SettingsOverlay
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentUser={currentUser}
        profile={userProfile}
        library={library}
        onUpdateProfile={(updates) => {
          if (!currentUser || !userProfile) return;
          const nextProfile = { ...userProfile, ...updates };
          setUserProfile(nextProfile);
          saveUserProfile(currentUser.email, nextProfile);
        }}
        onLogout={() => {
          handleLogout();
        }}
        onNavigateProfile={() => handleSetActiveTab("profile")}
      />
      {/* Extra bottom padding on mobile to clear the fixed bottom nav bar */}
      <main className="mx-auto max-w-[1400px] px-3 pb-28 sm:px-5 sm:pb-16 lg:px-10 xl:px-14" style={{ scrollBehavior: "smooth" }}>
        {(() => {
          if (activeTab === "profile") {
            return (
              <ProfilePage
                currentUser={currentUser}
                profile={userProfile}
                library={library}
                onUpdateProfile={(updates) => {
                  if (!currentUser || !userProfile) return;
                  const nextProfile = { ...userProfile, ...updates };
                  setUserProfile(nextProfile);
                  saveUserProfile(currentUser.email, nextProfile);
                }}
                onLogout={handleLogout}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenDetail={openDetail}
                onNavigateHome={() => handleSetActiveTab("home")}
              />
            );
          }
          // ══════════════════════════════════════════════════════════════════
          //  HOME  —  GUIDED DISCOVERY / COMMAND CENTER
          //  Job: help the user decide what to watch next.
          //  Identity: cinematic hero + curated smart rails (not exhaustive).
          // ══════════════════════════════════════════════════════════════════
          if (activeTab === "home") {
            // Curated home rows: 8 rows max — cross-genre, high signal
            const curatedHomeRows = homeRows.slice(0, 8);

            // Tonight's Pick — surface one watchlist title at a time
            const watchlistCandidates = library.watchlist.filter((i) => i.posterPath || i.backdropPath);
            const tonightPick = watchlistCandidates.length > 0
              ? watchlistCandidates[tonightPickIdx % watchlistCandidates.length]
              : null;

            // ── Mobile Home: app-grade layout for phone screens ──────────────
            if (IS_MOBILE) {
              return (
                <div className="-mx-3 sm:-mx-5">
                  <MobileHome
                    featured={featured}
                    trendingMovies={trendingMovies}
                    popularMovies={popularMovies}
                    popularSeries={popularSeries}
                    homeRows={homeRows as HomeRow[]}
                    continueWatchingItems={continueWatchingItems as MobileStreamItem[]}
                    library={library}
                    watchlistKeys={watchlistKeys}
                    watchedKeys={watchedKeys}
                    onOpen={openDetail}
                    onToggleWatchlist={toggleWatchlist}
                    onToggleWatched={toggleWatched}
                    onRemoveContinue={(item) => {
                      setLibrary((prev) => {
                        const nextWatching = { ...prev.watching };
                        delete nextWatching[String(item.id)];
                        return { ...prev, watching: nextWatching };
                      });
                    }}
                    tonightPickIdx={tonightPickIdx}
                    setTonightPickIdx={setTonightPickIdx}
                    homeError={homeError}
                  />
                </div>
              );
            }

            return (
              <>
                {/* ── Full cinematic hero — strongest on Home ── */}
                <div className="-mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14">
                  <Hero items={trendingMovies} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                </div>

                <div className="mt-10 space-y-0">
                  {homeError ? <EmptyState title="TMDB connection failed" body={homeError} /> : null}

                  {/* ── Tonight's Pick — decision helper ── */}
                  {tonightPick && (
                    <section className="mb-10">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
                        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">Tonight's Pick</h3>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <div className="relative overflow-hidden rounded-[18px] border border-white/8 bg-[#0d0f14]">
                        {/* Ambient backdrop */}
                        {(tonightPick.backdropPath || tonightPick.posterPath) && (
                          <img
                            src={`${BACKDROP_BASE}${tonightPick.backdropPath || tonightPick.posterPath}`}
                            className="absolute inset-0 h-full w-full object-cover opacity-25"
                            style={{ filter: "blur(18px)", transform: "scale(1.12)" }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/95 via-[#07080d]/75 to-transparent" aria-hidden="true" />
                        <div className="relative z-10 flex items-center gap-4 p-5 sm:gap-6 sm:p-6">
                          {/* Poster */}
                          <div
                            className="h-[90px] w-[62px] shrink-0 cursor-pointer overflow-hidden rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:h-[110px] sm:w-[76px]"
                            onClick={() => openDetail(tonightPick, tonightPick.mediaType)}
                          >
                            {tonightPick.posterPath ? (
                              <img src={`${POSTER_BASE}${tonightPick.posterPath}`} alt={tonightPick.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white/5"><Film size={18} className="text-white/20" /></div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#efb43f]/60">From your watchlist</p>
                            <h4
                              className="mt-1 cursor-pointer truncate text-[18px] font-black leading-tight tracking-[-0.03em] text-white sm:text-[20px]"
                              onClick={() => openDetail(tonightPick, tonightPick.mediaType)}
                            >
                              {tonightPick.title}
                            </h4>
                            <p className="mt-0.5 text-[12px] text-white/35">
                              {tonightPick.year && tonightPick.year !== "—" ? tonightPick.year : ""}
                              {tonightPick.year && tonightPick.mediaType ? " · " : ""}
                              {tonightPick.mediaType === "tv" ? "TV Show" : "Movie"}
                              {tonightPick.rating && Number(tonightPick.rating) > 0
                                ? ` · ★ ${Number(tonightPick.rating).toFixed(1)}`
                                : ""}
                            </p>
                            {/* CTAs */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => openDetail(tonightPick, tonightPick.mediaType)}
                                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#efb43f] px-4 text-[12px] font-black text-black shadow-[0_3px_14px_rgba(239,180,63,0.4)] transition hover:brightness-110 active:scale-[0.97]"
                              >
                                <Play size={12} fill="currentColor" /> Watch Now
                              </button>
                              <button
                                onClick={() => setTonightPickIdx((i) => i + 1)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.05] px-3.5 text-[12px] font-semibold text-white/65 transition hover:bg-white/[0.09] hover:text-white"
                              >
                                <RefreshCw size={11} /> Different Pick
                              </button>
                            </div>
                          </div>
                          {/* Watchlist count badge */}
                          {watchlistCandidates.length > 1 && (
                            <div className="hidden shrink-0 flex-col items-center sm:flex">
                              <span className="text-[28px] font-black tabular-nums text-[#efb43f]">{watchlistCandidates.length}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/30">waiting</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Continue Watching ── */}
                  {continueWatchingItems.length ? (
                    <ContentRow
                      title="Continue Watching"
                      items={continueWatchingItems}
                      onOpen={(rowItem) => { if (rowItem.sourceItem) openDetail(rowItem.sourceItem, rowItem.mediaType); }}
                      variant="continue"
                      onRemoveContinue={(rowItem) => {
                        setLibrary((prev) => {
                          const nextWatching = { ...prev.watching };
                          delete nextWatching[String(rowItem.id)];
                          return { ...prev, watching: nextWatching };
                        });
                      }}
                    />
                  ) : null}

                  {/* ── Because You Watched ── */}
                  {becauseYouWatchedItems.length && becauseYouWatchedTitle ? (
                    <ContentRow
                      title={`Because You Watched "${becauseYouWatchedTitle}"`}
                      items={becauseYouWatchedItems}
                      onOpen={(rowItem) => { if (rowItem.sourceItem) openDetail(rowItem.sourceItem, rowItem.mediaType); }}
                    />
                  ) : null}

                  {/* ── 8 curated discovery rails ── */}
                  {curatedHomeRows.map((row) => (
                    <Rail
                      key={row.title}
                      title={row.title}
                      items={row.items}
                      mediaType={row.mediaType}
                      onOpen={openDetail}
                      onToggleWatchlist={toggleWatchlist}
                      onToggleWatched={toggleWatched}
                      watchlistKeys={watchlistKeys}
                      watchedKeys={watchedKeys}
                      ratings={library.ratings}
                    />
                  ))}
                </div>
              </>
            );
          }

          // ══════════════════════════════════════════════════════════════════
          //  MOVIES  —  EXPLORER
          //  Job: browse, filter, and discover films with real tooling.
          //  Identity: compact ambient header + sticky filters + large grid.
          // ══════════════════════════════════════════════════════════════════
          if (activeTab === "movies") {
            // Genre catalogue for filter chips
            const MOVIE_GENRE_CHIPS = [
              { key: "all",        label: "All Films" },
              { key: "action",     label: "Action" },
              { key: "scifi",      label: "Sci-Fi" },
              { key: "horror",     label: "Horror" },
              { key: "comedy",     label: "Comedy" },
              { key: "thriller",   label: "Thriller" },
              { key: "crime",      label: "Crime" },
              { key: "romance",    label: "Romance" },
              { key: "animation",  label: "Animation" },
              { key: "drama",      label: "Drama" },
              { key: "documentary",label: "Documentary" },
              { key: "family",     label: "Family" },
              { key: "history",    label: "History" },
              { key: "western",    label: "Western" },
            ] as const;

            // Map filter key → movie array
            // When a specific genre is selected, prefer the on-demand 3-page fetch (50+ titles)
            const genrePoolMap: Record<string, MediaItem[]> = {
              all:         [...popularMovies, ...trendingMovies, ...latestMovies, ...fanFavorites],
              action:      moviesGenre === "action"      && moviesGenrePool.length ? moviesGenrePool : actionMovies,
              scifi:       moviesGenre === "scifi"       && moviesGenrePool.length ? moviesGenrePool : sciFiMovies,
              horror:      moviesGenre === "horror"      && moviesGenrePool.length ? moviesGenrePool : horrorMovies,
              comedy:      moviesGenre === "comedy"      && moviesGenrePool.length ? moviesGenrePool : comedyMovies,
              thriller:    moviesGenre === "thriller"    && moviesGenrePool.length ? moviesGenrePool : thrillerMovies,
              crime:       moviesGenre === "crime"       && moviesGenrePool.length ? moviesGenrePool : crimeThrillers,
              romance:     moviesGenre === "romance"     && moviesGenrePool.length ? moviesGenrePool : romanceMovies,
              animation:   moviesGenre === "animation"   && moviesGenrePool.length ? moviesGenrePool : animationMovies,
              drama:       moviesGenre === "drama"       && moviesGenrePool.length ? moviesGenrePool : [...fanFavorites, ...topRatedMovies],
              documentary: moviesGenre === "documentary" && moviesGenrePool.length ? moviesGenrePool : documentaryMovies,
              family:      moviesGenre === "family"      && moviesGenrePool.length ? moviesGenrePool : familyMovies,
              history:     moviesGenre === "history"     && moviesGenrePool.length ? moviesGenrePool : historyMovies,
              western:     moviesGenre === "western"     && moviesGenrePool.length ? moviesGenrePool : westernMovies,
            };

            // Sort pool
            let browsePool = [...(genrePoolMap[moviesGenre] || popularMovies)];
            // De-dupe by id
            const seenIds = new Set<number>();
            browsePool = browsePool.filter((i) => { if (seenIds.has(i.id)) return false; seenIds.add(i.id); return true; });

            // Apply sort
            if (moviesSort === "latest") browsePool.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
            else if (moviesSort === "toprated") browsePool.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            else if (moviesSort === "trending") browsePool = trendingMovies.filter((m) => !moviesSearch || getTitle(m).toLowerCase().includes(moviesSearch.toLowerCase()));

            // Apply search filter
            const moviesFiltered = moviesSearch.trim()
              ? browsePool.filter((m) => getTitle(m).toLowerCase().includes(moviesSearch.toLowerCase()))
              : browsePool;

            // Ambient backdrop — pick first item with backdrop
            const ambientItem = browsePool.find((m) => m.backdrop_path);

            return (
              <>
                {/* ── Compact editorial header — ambient, not cinematic hero ── */}
                <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 overflow-hidden">
                  {/* Ambient backdrop blur */}
                  {ambientItem?.backdrop_path && (
                    <img
                      src={`${BACKDROP_BASE}${ambientItem.backdrop_path}`}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-20"
                      style={{ filter: "blur(32px)", transform: "scale(1.1)" }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#07080d]/60 via-[#07080d]/80 to-[#07080d]" aria-hidden="true" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(239,180,63,0.06),transparent_70%)]" aria-hidden="true" />

                  {/* Header content */}
                  <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-4 sm:pt-8 pb-4">
                    <div className="flex items-end gap-4">
                      <div>
                        <h1 className="text-[22px] font-black tracking-[-0.04em] text-white sm:text-[30px] lg:text-[36px]">Films</h1>
                        <p className="mt-1 text-[12px] text-white/35 tracking-wide">
                          {moviesFiltered.length > 0
                            ? `${moviesFiltered.length} title${moviesFiltered.length !== 1 ? "s" : ""}${moviesSearch ? ` matching "${moviesSearch}"` : moviesGenre !== "all" ? ` in ${MOVIE_GENRE_CHIPS.find(c => c.key === moviesGenre)?.label || moviesGenre}` : ""}`
                            : "Explore the full catalogue"}
                        </p>
                      </div>
                    </div>

                    {/* ── Sticky search + sort bar ── */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[160px] max-w-[280px]">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          value={moviesSearch}
                          onChange={(e) => setMoviesSearch(e.target.value)}
                          placeholder="Search films…"
                          className="h-8 w-full rounded-[9px] border border-white/8 bg-white/[0.05] pl-8 pr-8 text-[12px] text-white placeholder-white/22 outline-none transition focus:border-white/18 focus:bg-white/[0.08]"
                        />
                        {moviesSearch && (
                          <button onClick={() => setMoviesSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      {/* Sort */}
                      <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-white/8 bg-white/[0.02]">
                        {([["popular","Popular"],["latest","Latest"],["toprated","Top Rated"],["trending","Trending"]] as const).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setMoviesSort(key)}
                            className={cn(
                              "px-3 py-1.5 text-[11px] font-medium transition",
                              moviesSort === key ? "bg-white/12 text-white" : "text-white/38 hover:text-white/65"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* View toggle */}
                      <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-white/8 bg-white/[0.02]">
                        {([["grid","⊞"],["list","≡"]] as const).map(([mode, icon]) => (
                          <button
                            key={mode}
                            onClick={() => setMoviesView(mode)}
                            className={cn(
                              "px-2.5 py-1.5 text-[13px] transition",
                              moviesView === mode ? "bg-white/12 text-white" : "text-white/35 hover:text-white/65"
                            )}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Genre chips ── */}
                    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {MOVIE_GENRE_CHIPS.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setMoviesGenre(key)}
                          className={cn(
                            "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
                            moviesGenre === key
                              ? "bg-[#efb43f] text-black shadow-[0_2px_10px_rgba(239,180,63,0.3)]"
                              : "border border-white/8 bg-white/[0.04] text-white/50 hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Browse grid ── */}
                <div className="mt-6">
                  {moviesFiltered.length === 0 ? (
                    <EmptyState title="No films found" body={moviesSearch ? `Try a different search term` : "Check back soon"} />
                  ) : moviesView === "grid" ? (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                      {moviesFiltered.slice(0, IS_MOBILE ? 20 : 60).map((item) => {
                        const type: MediaType = "movie";
                        const k = keyFor({ id: item.id, mediaType: type });
                        return (
                          <div key={k} className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[12px] bg-white/[0.04]" onClick={() => openDetail(item, type)}>
                            {item.poster_path ? (
                              <img src={`${POSTER_BASE}${item.poster_path}`} alt={getTitle(item)} loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.06]" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                                <Film size={26} className="text-white/12" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2.5 pt-10">
                              <p className="text-[11px] font-semibold text-white line-clamp-2">{getTitle(item)}</p>
                              <div className="mt-[3px] flex items-center gap-1">
                                {item.release_date && <span className="text-[9px] text-white/32">{item.release_date.slice(0, 4)}</span>}
                                {item.vote_average != null && item.vote_average > 0 && (
                                  <><span className="text-[8px] text-white/18">·</span>
                                  <span className="text-[9px] font-semibold text-[#efb43f]">★ {Number(item.vote_average).toFixed(1)}</span></>
                                )}
                              </div>
                            </div>
                            {watchlistKeys.has(k) && (
                              <div className="absolute left-1.5 top-1.5">
                                <span className="inline-flex items-center gap-[3px] rounded-full bg-[#efb43f]/22 px-[5px] py-[3px] text-[9px] font-semibold text-[#efb43f]">
                                  <Bookmark size={6} fill="currentColor" />
                                </span>
                              </div>
                            )}
                            {watchedKeys.has(k) && (
                              <div className="absolute right-1.5 top-1.5">
                                <span className="inline-flex items-center rounded-full bg-white/14 px-[5px] py-[3px] text-[9px] font-semibold text-white/50">
                                  <Check size={6} />
                                </span>
                              </div>
                            )}
                            {/* Quick actions overlay */}
                            <div
                              className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/78 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button onClick={() => openDetail(item, type)}
                                className="w-[112px] rounded-[8px] bg-[#efb43f] py-1.5 text-[11px] font-bold text-black transition hover:brightness-110">
                                Open Details
                              </button>
                              <button onClick={() => toggleWatchlist(item, type)}
                                className={cn("w-[112px] rounded-[8px] py-1.5 text-[11px] font-semibold transition",
                                  watchlistKeys.has(k)
                                    ? "bg-[#efb43f]/20 text-[#efb43f] border border-[#efb43f]/40"
                                    : "border border-[#efb43f]/30 bg-[#efb43f]/10 text-[#efb43f] hover:bg-[#efb43f]/20")}>
                                {watchlistKeys.has(k) ? "✓ In Watchlist" : "+ Watchlist"}
                              </button>
                              <button onClick={() => toggleWatched(item, type)}
                                className={cn("w-[112px] rounded-[8px] py-1.5 text-[11px] font-semibold transition",
                                  watchedKeys.has(k)
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-600 text-white hover:bg-emerald-500")}>
                                {watchedKeys.has(k) ? "✓ Watched" : "Mark Watched"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List view */
                    <div className="space-y-0">
                      {moviesFiltered.slice(0, IS_MOBILE ? 20 : 60).map((item) => {
                        const type: MediaType = "movie";
                        const k = keyFor({ id: item.id, mediaType: type });
                        return (
                          <div key={k} className="group flex items-center gap-3 rounded-[10px] px-3 py-2 transition hover:bg-white/[0.04] cursor-pointer" onClick={() => openDetail(item, type)}>
                            <div className="h-[58px] w-[40px] shrink-0 overflow-hidden rounded-[7px] bg-white/[0.06]">
                              {item.poster_path
                                ? <img src={`${POSTER_BASE}${item.poster_path}`} alt={getTitle(item)} className="h-full w-full object-cover" loading="lazy" />
                                : <div className="flex h-full w-full items-center justify-center"><Film size={13} className="text-white/18" /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-white">{getTitle(item)}</p>
                              <div className="mt-[3px] flex items-center gap-1.5 text-[10px] text-white/32">
                                {item.release_date && <span>{item.release_date.slice(0, 4)}</span>}
                                {item.vote_average != null && item.vote_average > 0 && (
                                  <><span className="text-white/18">·</span>
                                  <span className="text-[#efb43f] font-semibold">★ {Number(item.vote_average).toFixed(1)}</span></>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => toggleWatchlist(item, type)}
                                className={cn("flex h-7 w-7 items-center justify-center rounded-full transition",
                                  watchlistKeys.has(k) ? "bg-[#efb43f]/25 text-[#efb43f]" : "bg-[#efb43f]/15 text-[#efb43f] hover:bg-[#efb43f]/25")}>
                                <Bookmark size={11} />
                              </button>
                              <button onClick={() => toggleWatched(item, type)}
                                className={cn("flex h-7 w-7 items-center justify-center rounded-full transition",
                                  watchedKeys.has(k) ? "bg-emerald-600 text-white" : "bg-emerald-600/70 text-white hover:bg-emerald-600")}>
                                <Check size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Discovery rails at bottom — for context when browsing */}
                  {moviesGenre === "all" && !moviesSearch && (
                    <div className="mt-12">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f]/50 to-[#c97a0a]/30" />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/25">Browse by category</span>
                        <div className="h-px flex-1 bg-white/[0.04]" />
                      </div>
                      {movieRows.slice(5).map((row) => (
                        <Rail key={row.title} title={row.title} items={row.items} mediaType={row.mediaType}
                          onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched}
                          watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          }

          // ══════════════════════════════════════════════════════════════════
          //  TV SHOWS  —  TRACKER
          //  Job: manage episodic progress + return behavior.
          //  Identity: progress-first header, watching dashboard, then discovery.
          // ══════════════════════════════════════════════════════════════════
          if (activeTab === "series") {
            // TV shows in user's library by status
            const tvWatching  = (library.watchingItems || []).filter((i) => i.mediaType === "tv");
            const tvWatchlist = library.watchlist.filter((i) => i.mediaType === "tv");
            const tvWaiting   = (library.waitingItems || []).filter((i) => i.mediaType === "tv");
            const tvWatched   = library.watched.filter((i) => i.mediaType === "tv");
            const tvTotal     = tvWatching.length + tvWatchlist.length + tvWaiting.length + tvWatched.length;

            // Genre discovery filter
            const TV_GENRE_CHIPS = [
              { key: "all",    label: "All Shows" },
              { key: "drama",  label: "Drama" },
              { key: "crime",  label: "Crime" },
              { key: "scifi",  label: "Sci-Fi & Fantasy" },
              { key: "comedy", label: "Comedy" },
              { key: "mystery",label: "Mystery" },
              { key: "action", label: "Action" },
              { key: "animation", label: "Animation" },
              { key: "reality", label: "Reality" },
              { key: "documentary", label: "Documentary" },
            ] as const;

            return (
              <>
                {/* ── TV Tracker header — progress-first, not cinematic hero ── */}
                <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 overflow-hidden">
                  {/* Layered series backdrop — collage blur of watching items */}
                  {continueWatchingItems.slice(0, 3).map((ci, i) => ci.image && (
                    <img
                      key={i}
                      src={`${BACKDROP_BASE}${ci.image}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        opacity: 0.08 - i * 0.025,
                        filter: "blur(28px)",
                        transform: `scale(1.15) translateX(${i * 10}%)`,
                      }}
                      aria-hidden="true"
                    />
                  ))}
                  <div className="absolute inset-0 bg-[#07080d]/85" aria-hidden="true" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_10%_50%,rgba(56,189,248,0.06),transparent_65%)]" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#07080d] to-transparent" aria-hidden="true" />

                  <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-4 sm:pt-8 pb-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      {/* Title + stats */}
                      <div>
                        <h1 className="text-[22px] font-black tracking-[-0.04em] text-white sm:text-[30px] lg:text-[36px]">TV Shows</h1>
                        <p className="mt-1.5 text-[12px] text-white/38 tracking-wide">
                          {[
                            tvWatching.length > 0  && `${tvWatching.length} watching`,
                            tvWatchlist.length > 0 && `${tvWatchlist.length} queued`,
                            tvWatched.length > 0   && `${tvWatched.length} finished`,
                          ].filter(Boolean).join("  ·  ") || "Track your series progress"}
                        </p>
                      </div>
                      {/* Progress ring — total tracked */}
                      {tvTotal > 0 && (
                        <div className="flex items-center gap-3 rounded-[12px] border border-sky-500/15 bg-sky-500/8 px-4 py-2.5">
                          <div className="text-center">
                            <span className="block text-[22px] font-black tabular-nums text-sky-400">{tvTotal}</span>
                            <span className="block text-[9px] font-semibold uppercase tracking-wide text-sky-400/50">tracked</span>
                          </div>
                          {tvWatching.length > 0 && (
                            <div className="h-8 w-px bg-white/8" />
                          )}
                          {tvWatching.length > 0 && (
                            <div className="text-center">
                              <span className="block text-[22px] font-black tabular-nums text-cyan-400">{tvWatching.length}</span>
                              <span className="block text-[9px] font-semibold uppercase tracking-wide text-cyan-400/50">in progress</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  {/* ── Continue Watching — top priority ── */}
                  {continueWatchingItems.length > 0 && (
                    <ContentRow
                      title="Continue Watching"
                      items={continueWatchingItems}
                      onOpen={(rowItem) => { if (rowItem.sourceItem) openDetail(rowItem.sourceItem, rowItem.mediaType); }}
                      variant="continue"
                      onRemoveContinue={(rowItem) => {
                        setLibrary((prev) => {
                          const nextWatching = { ...prev.watching };
                          delete nextWatching[String(rowItem.id)];
                          return { ...prev, watching: nextWatching };
                        });
                      }}
                    />
                  )}

                  {/* ── Up Next: TV shows in watchlist — start something new ── */}
                  {tvWatchlist.length > 0 && (
                    <section className="mb-10">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-[#efb43f] to-[#c97a0a]" />
                        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">Start Watching</h3>
                        <span className="rounded-full bg-[#efb43f]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#efb43f]">{tvWatchlist.length}</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
                        {tvWatchlist.map((show) => {
                          const k = keyFor(show);
                          return (
                            <div key={k} className="group relative w-[150px] shrink-0 cursor-pointer sm:w-[180px]">
                              <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.04]"
                                onClick={() => openDetail(show, "tv")}>
                                {show.posterPath ? (
                                  <img src={`${POSTER_BASE}${show.posterPath}`} alt={show.title}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]" loading="lazy" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                                    <Tv size={22} className="text-white/15" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2.5 pt-10">
                                  <p className="text-[11px] font-semibold text-white line-clamp-2">{show.title}</p>
                                  {show.year && show.year !== "—" && <p className="text-[9px] text-white/32 mt-0.5">{show.year}</p>}
                                </div>
                                <div className="absolute left-1.5 top-1.5">
                                  <span className="inline-flex items-center gap-[3px] rounded-full bg-[#efb43f]/22 px-[5px] py-[3px] text-[9px] font-semibold text-[#efb43f]">
                                    <Bookmark size={6} fill="currentColor" />
                                  </span>
                                </div>
                              </div>
                              {/* Quick start CTA */}
                              <button
                                onClick={() => addToWatching(show, "tv")}
                                className="mt-1.5 w-full rounded-[8px] border border-cyan-500/25 bg-cyan-500/10 py-1.5 text-[11px] font-semibold text-cyan-400 transition hover:bg-cyan-500/20 active:scale-[0.97]"
                              >
                                ▶ Start Watching
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Waiting (upcoming shows) ── */}
                  {tvWaiting.length > 0 && (
                    <section className="mb-10">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-4 w-[3px] rounded-sm bg-gradient-to-b from-amber-400 to-amber-600" />
                        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-white md:text-[16px]">Waiting to Air</h3>
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">{tvWaiting.length}</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
                        {tvWaiting.map((show) => {
                          const k = keyFor(show);
                          return (
                            <div key={k} className="group relative w-[130px] shrink-0 cursor-pointer sm:w-[155px]"
                              onClick={() => openDetail(show, "tv")}>
                              <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] ring-1 ring-inset ring-amber-500/28 bg-white/[0.04]">
                                {show.posterPath ? (
                                  <img src={`${POSTER_BASE}${show.posterPath}`} alt={show.title}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]" loading="lazy" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                                    <Tv size={20} className="text-white/15" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2.5 pt-8">
                                  <p className="text-[10px] font-semibold text-white line-clamp-2">{show.title}</p>
                                </div>
                                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />
                                <div className="absolute left-1.5 top-1.5">
                                  <span className="inline-flex items-center gap-[3px] rounded-full bg-amber-500/22 px-[5px] py-[3px] text-[9px] font-semibold text-amber-400">
                                    <Clock size={6} />
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Discovery: genre-filtered rails ── */}
                  <div className="mt-2">
                    {/* Genre chips for discovery */}
                    <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {TV_GENRE_CHIPS.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setTvDiscoveryGenre(key)}
                          className={cn(
                            "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
                            tvDiscoveryGenre === key
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                              : "border border-white/8 bg-white/[0.03] text-white/45 hover:border-white/15 hover:text-white/70"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Show genre-filtered rows or all rows */}
                    {(tvDiscoveryGenre === "all" ? seriesRows : seriesRows.filter((row) => {
                      const rowLower = row.title.toLowerCase();
                      const gMap: Record<string, string[]> = {
                        drama:       ["drama"],
                        crime:       ["crime"],
                        scifi:       ["sci-fi", "fantasy"],
                        comedy:      ["comedy"],
                        mystery:     ["mystery"],
                        action:      ["action", "adventure"],
                        animation:   ["animation"],
                        reality:     ["reality"],
                        documentary: ["documentary"],
                      };
                      return (gMap[tvDiscoveryGenre] || []).some((kw) => rowLower.includes(kw));
                    })).map((row) => (
                      <Rail key={row.title} title={row.title} items={row.items} mediaType={row.mediaType}
                        onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched}
                        watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                    ))}
                  </div>
                </div>
              </>
            );
          }

          // ══════════════════════════════════════════════════════════════════
          //  ANIME  —  Discovery tab
          // ══════════════════════════════════════════════════════════════════
          if (activeTab === "anime") {
            const ANIME_GENRE_CHIPS = [
              { key: "all",          label: "All Anime"     },
              { key: "action",       label: "Action"        },
              { key: "fantasy",      label: "Fantasy"       },
              { key: "romance",      label: "Romance"       },
              { key: "comedy",       label: "Comedy"        },
              { key: "drama",        label: "Drama"         },
              { key: "scifi",        label: "Sci-Fi"        },
              { key: "sliceoflife",  label: "Slice of Life" },
              { key: "mecha",        label: "Mecha"         },
              { key: "supernatural", label: "Supernatural"  },
            ] as const;

            // Build pool based on sort selection
            let animePool: MediaItem[] = (() => {
              if (animeSort === "toprated") return [...topRatedAnime];
              if (animeSort === "latest")   return [...airingAnime];
              if (animeSort === "movies")   return [...animeMovies];
              return [...trendingAnime]; // popular (default)
            })();
            const seenAnimeIds = new Set<number>();
            animePool = animePool.filter(i => { if (seenAnimeIds.has(i.id)) return false; seenAnimeIds.add(i.id); return true; });
            const animeFiltered = animeSearch.trim()
              ? animePool.filter(i => getTitle(i).toLowerCase().includes(animeSearch.toLowerCase()))
              : animePool;
            const ambientAnime = animePool.find(m => m.backdrop_path);

            return (
              <>
                {/* ── Compact ambient header ── */}
                <div className="relative -mx-3 sm:-mx-5 lg:-mx-10 xl:-mx-14 overflow-hidden">
                  {ambientAnime?.backdrop_path && (
                    <img src={`${BACKDROP_BASE}${ambientAnime.backdrop_path}`}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-20"
                      style={{ filter: "blur(32px)", transform: "scale(1.1)" }} aria-hidden="true" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#07080d]/60 via-[#07080d]/80 to-[#07080d]" aria-hidden="true" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(239,180,63,0.06),transparent_70%)]" aria-hidden="true" />

                  <div className="relative z-10 px-3 sm:px-5 lg:px-10 xl:px-14 pt-4 sm:pt-8 pb-4">
                    <div>
                      <h1 className="text-[22px] font-black tracking-[-0.04em] text-white sm:text-[30px] lg:text-[36px]">Anime</h1>
                      <p className="mt-1 text-[12px] text-white/35 tracking-wide">
                        {animeFiltered.length > 0
                          ? `${animeFiltered.length} title${animeFiltered.length !== 1 ? "s" : ""}${animeSearch ? ` matching "${animeSearch}"` : animeDiscoveryGenre !== "all" ? ` in ${ANIME_GENRE_CHIPS.find(c => c.key === animeDiscoveryGenre)?.label || animeDiscoveryGenre}` : ""}`
                          : "Discover anime series and films"}
                      </p>
                    </div>

                    {/* Search + Sort + View toggle */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[160px] max-w-[280px]">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input value={animeSearch} onChange={e => setAnimeSearch(e.target.value)}
                          placeholder="Search anime…"
                          className="h-8 w-full rounded-[9px] border border-white/8 bg-white/[0.05] pl-8 pr-8 text-[12px] text-white placeholder-white/22 outline-none transition focus:border-white/18 focus:bg-white/[0.08]" />
                        {animeSearch && (
                          <button onClick={() => setAnimeSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-white/8 bg-white/[0.02]">
                        {([["popular","Popular"],["latest","Latest"],["toprated","Top Rated"],["movies","Movies"]] as const).map(([key, label]) => (
                          <button key={key} onClick={() => setAnimeSort(key)}
                            className={cn("px-3 py-1.5 text-[11px] font-medium transition",
                              animeSort === key ? "bg-white/12 text-white" : "text-white/38 hover:text-white/65")}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-white/8 bg-white/[0.02]">
                        {([["grid","⊞"],["list","≡"]] as const).map(([mode, icon]) => (
                          <button key={mode} onClick={() => setAnimeView(mode)}
                            className={cn("px-2.5 py-1.5 text-[13px] transition",
                              animeView === mode ? "bg-white/12 text-white" : "text-white/35 hover:text-white/65")}>
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Genre chips */}
                    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {ANIME_GENRE_CHIPS.map(({ key, label }) => (
                        <button key={key} onClick={() => setAnimeDiscoveryGenre(key)}
                          className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
                            animeDiscoveryGenre === key
                              ? "bg-[#efb43f] text-black shadow-[0_2px_10px_rgba(239,180,63,0.3)]"
                              : "border border-white/8 bg-white/[0.04] text-white/50 hover:border-white/15 hover:bg-white/[0.08] hover:text-white")}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Browse grid / list */}
                <div className="mt-6">
                  {animeFiltered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="mb-3 text-5xl opacity-20">✨</div>
                      {animeLoaded
                        ? <p className="text-[15px] font-semibold text-white/40">{animeSearch ? `No results for "${animeSearch}"` : "No anime found for this genre."}</p>
                        : <p className="text-[15px] font-semibold text-white/40">Loading anime…</p>}
                    </div>
                  ) : animeView === "grid" ? (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                      {animeFiltered.slice(0, IS_MOBILE ? 20 : 60).map(item => {
                        const type = (item.media_type as MediaType) || "tv";
                        const k = keyFor({ id: item.id, mediaType: type });
                        return (
                          <div key={k} className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[12px] bg-white/[0.04]" onClick={() => openDetail(item, type)}>
                            {item.poster_path ? (
                              <img src={`${POSTER_BASE}${item.poster_path}`} alt={getTitle(item)} loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.06]" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white/[0.03]"><Film size={26} className="text-white/12" /></div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2.5 pt-10">
                              <p className="text-[11px] font-semibold text-white line-clamp-2">{getTitle(item)}</p>
                              <div className="mt-[3px] flex items-center gap-1">
                                {(item.first_air_date || item.release_date) && <span className="text-[9px] text-white/32">{(item.first_air_date || item.release_date || "").slice(0, 4)}</span>}
                                {item.vote_average != null && item.vote_average > 0 && (
                                  <><span className="text-[8px] text-white/18">·</span><span className="text-[9px] font-semibold text-[#efb43f]">★ {Number(item.vote_average).toFixed(1)}</span></>
                                )}
                              </div>
                            </div>
                            {watchlistKeys.has(k) && <div className="absolute left-1.5 top-1.5"><span className="inline-flex items-center gap-[3px] rounded-full bg-[#efb43f]/22 px-[5px] py-[3px] text-[9px] font-semibold text-[#efb43f]"><Bookmark size={6} fill="currentColor" /></span></div>}
                            {watchedKeys.has(k) && <div className="absolute right-1.5 top-1.5"><span className="inline-flex items-center rounded-full bg-white/14 px-[5px] py-[3px] text-[9px] font-semibold text-white/50"><Check size={6} /></span></div>}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/78 opacity-0 transition-opacity duration-200 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openDetail(item, type)} className="w-[112px] rounded-[8px] bg-[#efb43f] py-1.5 text-[11px] font-bold text-black transition hover:brightness-110">Open Details</button>
                              <button onClick={() => toggleWatchlist(item, type)} className={cn("w-[112px] rounded-[8px] py-1.5 text-[11px] font-semibold transition", watchlistKeys.has(k) ? "bg-[#efb43f]/20 text-[#efb43f] border border-[#efb43f]/40" : "border border-[#efb43f]/30 bg-[#efb43f]/10 text-[#efb43f] hover:bg-[#efb43f]/20")}>{watchlistKeys.has(k) ? "✓ In Watchlist" : "+ Watchlist"}</button>
                              <button onClick={() => toggleWatched(item, type)} className={cn("w-[112px] rounded-[8px] py-1.5 text-[11px] font-semibold transition", watchedKeys.has(k) ? "bg-white/10 text-white/60 border border-white/20" : "border border-white/15 bg-white/[0.05] text-white/45 hover:bg-white/[0.1]")}>{watchedKeys.has(k) ? "✓ Watched" : "Mark Watched"}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[3px]">
                      {animeFiltered.slice(0, 60).map(item => {
                        const type = (item.media_type as MediaType) || "tv";
                        const k = keyFor({ id: item.id, mediaType: type });
                        return (
                          <div key={k} onClick={() => openDetail(item, type)}
                            className="group flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition hover:bg-white/[0.04]">
                            <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[7px] bg-white/[0.04]">
                              {item.poster_path
                                ? <img src={`${POSTER_BASE}${item.poster_path}`} alt={getTitle(item)} loading="lazy" className="h-full w-full object-cover" />
                                : <div className="flex h-full w-full items-center justify-center"><Film size={14} className="text-white/12" /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-white">{getTitle(item)}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-[11px] text-white/35">{(item.first_air_date || item.release_date || "").slice(0, 4)}</span>
                                {item.vote_average != null && item.vote_average > 0 && <span className="text-[11px] font-semibold text-[#efb43f]">★ {Number(item.vote_average).toFixed(1)}</span>}
                                {type === "movie" && <span className="text-[9px] font-semibold uppercase tracking-wide text-white/20">Film</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {watchlistKeys.has(k) && <Bookmark size={12} className="text-[#efb43f]" fill="currentColor" />}
                              {watchedKeys.has(k) && <Check size={12} className="text-white/30" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            );
          }

          if (activeTab === "mylist" || activeTab === "lists" || activeTab === "watchlist" || activeTab === "watched") {
            return activeTab === "lists" ? (
              <ListsView
                library={library}
                customLists={library.customLists ?? []}
                ratings={library.ratings}
                onOpenLibrary={() => handleSetActiveTab("mylist")}
                onCreateList={createCustomList}
                onDeleteList={deleteCustomList}
                onRenameList={renameCustomList}
                onAddToList={addToCustomList}
                onRemoveFromList={removeFromCustomList}
                onOpen={openDetail}
                followedPeople={library.followedPeople ?? []}
                onOpenPerson={(id) => setTopPersonModalId(id)}
              />
            ) : (
              <MyListView
                library={library}
                watchlistKeys={watchlistKeys}
                watchedKeys={watchedKeys}
                watchingKeys={watchingKeys}
                waitingKeys={waitingKeys}
                onOpen={openDetail}
                onToggleWatchlist={toggleWatchlist}
                onToggleWatched={toggleWatched}
                onAddToWatching={addToWatching}
                onAddToWaiting={addToWaiting}
                onRemoveFromLibrary={removeFromLibrary}
                onExport={exportLibrary}
                onImport={importLibrary}
                appLanguage={appLanguage}
                initialTab={activeTab === "watchlist" ? "watchlist" : activeTab === "watched" ? "watched" : "all"}
              />
            );
          }
        })()}
      </main>

      <DetailModal
        open={Boolean(selectedItem && selectedType)}
        item={selectedItem}
        mediaType={selectedType}
        onClose={closeDetail}
        inWatchlist={selectedKey ? watchlistKeys.has(selectedKey) : false}
        inWatched={selectedKey ? watchedKeys.has(selectedKey) : false}
        userRating={selectedKey ? library.ratings[selectedKey] : undefined}
        onToggleWatchlist={() => selectedItem && selectedType && toggleWatchlist(selectedItem, selectedType)}
        onToggleWatched={() => selectedItem && selectedType && toggleWatched(selectedItem, selectedType)}
        onRate={(rating) => selectedItem && selectedType && setRating(selectedItem, selectedType, rating)}
        library={library}
        setWatchingSeason={setWatchingSeason}
        toggleEpisode={toggleEpisode}
        setEpisodeFilter={setEpisodeFilter}
        setCurrentEpisode={setCurrentEpisode}
        continueToNextEpisode={continueToNextEpisode}
        markEpisodesUpTo={markEpisodesUpTo}
        markSeasonComplete={markSeasonComplete}
        clearSeasonEpisodes={clearSeasonEpisodes}
        onResolveLibraryItem={resolveLibraryItemToTMDB}
        onOpenRelated={openDetail}
        onToggleSimilarWatchlist={toggleWatchlist}
        onToggleSimilarWatched={toggleWatched}
        similarWatchlistKeys={watchlistKeys}
        similarWatchedKeys={watchedKeys}
        ratingsMap={library.ratings}
        appLanguage={appLanguage}
        onOpenWatch={openWatch}
        onSaveNote={(key, note) => setLibrary(prev => ({ ...prev, notes: { ...prev.notes, [key]: note } }))}
        userNote={selectedItem ? library.notes[keyFor({ id: selectedItem.id, mediaType: selectedType || ("mediaType" in selectedItem ? selectedItem.mediaType : "movie") })] : ""}
        followedPeople={library.followedPeople ?? []}
        onToggleFollowPerson={toggleFollowPerson}
      />
      {/* Top-level PersonModal — used by Following rail in ListsView */}
      <PersonModal
        open={topPersonModalId !== null}
        personId={topPersonModalId}
        onClose={() => setTopPersonModalId(null)}
        onOpenItem={(item, mt) => { setTopPersonModalId(null); openDetail(item, mt); }}
        isFollowed={(library.followedPeople ?? []).some(p => p.id === topPersonModalId)}
        onToggleFollow={toggleFollowPerson}
      />
      <WatchModal open={Boolean(watchPayload)} payload={watchPayload} onClose={closeWatch} />

      {/* ── Mobile Bottom Navigation (phone only) ── */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          handleSetActiveTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSearchOpen={() => setSearchOpen(true)}
      />

      {/* Footer: visible on desktop, hidden on phone (bottom nav takes over) */}
      <div className="hidden sm:block">
        <GoodFilmFooter />
      </div>
    </AppShell>
  );
}
